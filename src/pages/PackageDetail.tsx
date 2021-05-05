import React from "react";
import { RouteChildrenProps, Route } from "react-router";
import { GlobalState, IGlobalState } from "../providers";
import { Row, Col, Button, Icon, Divider, Tree, Spin, Tag } from "antd";
import { SubHeader, SmallText } from "../components/UIFragments";
import {
  IPackage,
  ICachedPackageItem,
  IPackageVersion,
  IPackageVersionWithVersionData
} from "../commons/interfaces";
import styled from "styled-components";
import _ from "lodash";
import {
  configuredDayJs,
  mimeTypeToType,
  PackageSetItemType
} from "../commons/utils";
import { Link } from "react-router-dom";
import { VersionTimeline } from "../components/VersionTimeline";
import { PackagePreviewDisplay } from "../components/PackagePreviewDisplay";
import { DiffModal } from "../components/DiffModal";
import { async } from "q";
import { notifyOk, notifyInfo } from "../commons/notify";

const TreeNode = Tree.TreeNode;

export class PackageDetailPage extends React.Component<RouteChildrenProps> {
  render() {
    return (
      <GlobalState.Consumer>
        {context => (
          <PackageDetailPageInternal {...this.props} context={context} />
        )}
      </GlobalState.Consumer>
    );
  }
}

const SlashSpan = styled.span`
  font-size: 1.2em;
  padding-left: 0.2em;
  padding-right: 0.1em;
  color: #999;
`;

export class PackageDetailPageInternal extends React.Component<
  RouteChildrenProps & { context: IGlobalState },
  {
    package?: IPackage;
    is404: Boolean;
    versions: IPackageVersion[];
    latestVersion?: IPackageVersionWithVersionData;
    isFetchingPreview: boolean;
    selectedVersion: number;
    showCreateVersionModal: boolean;
    isPublishing: boolean;
  }
> {
  constructor(props: any) {
    super(props);
    this.state = {
      package: undefined,
      latestVersion: undefined,
      is404: false,
      versions: [],
      isFetchingPreview: false,
      selectedVersion: -1,
      showCreateVersionModal: false,
      isPublishing: false
    };
  }

  async getPackageDetails() {
    const params: any = this.props.match!.params;
    const currentPackageSetSlug = params.packageSetId;

    const ops = this.props.context.modelOps;
    const ps = this.props.context.packageSets;

    const currentSlug = params.packageId;

    if (ops && ps) {
      const currentPs = await this.props.context.setPackageSet(
        currentPackageSetSlug
      );

      // @TODO: currently ignoring missing packageset, should display 404
      const packageResponse = await ops.getPackageDetails(
        currentPs!,
        currentSlug
      );
      if (packageResponse) {
        console.log("Got package:", packageResponse.data);
        this.setState({ package: packageResponse.data });

        const packageVersions = await ops.getPackageVersions(
          currentPs!,
          currentSlug
        );
        console.log("Got package versions:", packageVersions);

        if (packageVersions) {
          this.setState({ versions: packageVersions.data.results });
        }
      } else {
        this.setState({ is404: true });
      }
    }
  }

  componentDidMount() {
    this.getPackageDetails();
  }

  componentDidUpdate(
    prevProps: RouteChildrenProps & { context: IGlobalState }
  ) {
    // use props
    if (
      prevProps.context.selectedPackageSet !==
        this.props.context.selectedPackageSet ||
      prevProps.match!.params !== this.props.match!.params
    ) {
      this.getPackageDetails();
    }
  }

  toggleCreateVersionModal = async () => {
    if (this.state.showCreateVersionModal == true) {
      this.setState({
        showCreateVersionModal: false
      });
    } else {
      const ops = this.props.context.modelOps!;

      const packageVersion = await ops.getPackageDetailsWithVersion(
        this.props.context.selectedPackageSet!,
        this.state.package!.slug,
        this.state.versions.length
      );

      console.log(
        "Opening modal, latest version",
        packageVersion.data.version_data
      );
      this.setState(
        {
          latestVersion: packageVersion.data.version_data
        },
        () => {
          this.setState({
            showCreateVersionModal: !this.state.showCreateVersionModal
          });
        }
      );
    }
  };

  handlePreviewUpdate = async () => {
    const ops = this.props.context.modelOps!;
    this.setState({
      isFetchingPreview: true
    });

    const results = await ops.updatePackageCache(
      this.props.context.selectedPackageSet!,
      this.state.package!
    );

    console.log("Refreshed package from cache:", results.data);
    this.setState({ package: results.data, isFetchingPreview: false });
  };

  handleVersionCreation = async (
    title: string,
    description: string,
    files: string[]
  ) => {
    const ops = this.props.context.modelOps!;
    await ops.createPackageVersion(
      this.props.context.selectedPackageSet!,
      this.state.package!,
      {
        title: title,
        version_description: description,
        included_items: files
      }
    );
  };

  handleSubmit = async () => {
    this.setState({
      package: undefined,
      latestVersion: undefined,
      versions: []
    });
    await this.getPackageDetails();
  };

  handlePublish = async () => {
    const ops = this.props.context.modelOps!;
    this.setState({ isPublishing: true });
    notifyInfo("Started publishing. This might take a while.");
    const res = await ops.publishPackage(
      this.props.context.selectedPackageSet!,
      this.state.package!
    );
    await this.getPackageDetails();
    this.setState({ isPublishing: false });
    if (res) {
      // res will be undefined if unsuccessful due to interceptor
      notifyOk("Published Successfully!");
    }
  };

  sortedCachedProperties = () => {
    if (this.state.package)
      return (_.groupBy(this.state.package.cached, ci =>
        mimeTypeToType(ci.mimeType)
      ) as any) as {
        [key in PackageSetItemType]: ICachedPackageItem[] | undefined
      };
  };

  renderTree() {
    return (
      <Tree showIcon defaultExpandAll switcherIcon={<Icon type="down" />}>
        {_.map(
          this.sortedCachedProperties(),
          (value: ICachedPackageItem[], key) => {
            const items = value.map(i => {
              return <TreeNode isLeaf={true} key={i.title} title={i.title} />;
            });
            console.log(items);

            return (
              <TreeNode icon={<Icon type="smile-o" />} title={key} key={key}>
                {items}
              </TreeNode>
            );
          }
        )}
      </Tree>
    );
  }

  renderImageCards() {
    return _.map(this.sortedCachedProperties(), () => {});
  }

  renderStateIcon() {
    switch (this.state.package!.state) {
      case "wip":
        return <Tag color="orange">IN PROGRESS</Tag>;
      case "rdy":
        return <Tag color="green">READY</Tag>;
      case "pub":
        return <Tag>Published</Tag>;
    }
  }

  render() {
    const lastFetchedDate =
      this.state.package && this.state.package.last_fetched_date
        ? configuredDayJs(this.state.package.last_fetched_date)
        : undefined;

    const cachedProperties = this.sortedCachedProperties();

    return (
      <>
        <Row gutter={32}>
          {this.state.package ? (
            <>
              <DiffModal
                key={
                  this.state.package.id +
                  this.state.package.last_fetched_date +
                  (this.state.latestVersion
                    ? this.state.latestVersion.id
                    : this.state.versions.length)
                }
                handleSubmit={this.handleVersionCreation}
                onSubmit={this.handleSubmit}
                isOpen={this.state.showCreateVersionModal}
                setOpen={this.toggleCreateVersionModal}
                cachedPackage={this.state.package}
                latestCommittedVersion={this.state.latestVersion}
              />
              <Col span={6}>
                <SubHeader>PACKAGE INFO</SubHeader>
                <h3>
                  <Link to={`/${this.state.package.package_set}`}>
                    {this.state.package.package_set}
                  </Link>
                  <SlashSpan>/</SlashSpan>
                  {this.state.package.slug}
                </h3>
                <div style={{ marginBottom: "1em" }} />
                {this.renderStateIcon()}

                <Divider />
                <Button
                  style={{
                    marginBottom: "1em",
                    maxWidth: "200px",
                    display: "block"
                  }}
                  type="primary"
                  block
                  onClick={this.toggleCreateVersionModal}
                  icon="file-add"
                >
                  Create Version
                </Button>
                <Button
                  style={{
                    marginBottom: "1em",
                    maxWidth: "200px",
                    display: "block"
                  }}
                  icon="export"
                  block
                  onClick={this.handlePublish}
                  loading={this.state.isPublishing}
                  disabled={this.state.versions.length < 1}
                >
                  Publish
                </Button>
                <Button.Group
                  style={{
                    marginBottom: "1em"
                  }}
                >
                  <Button
                    href={this.state.package.metadata.google_drive!.folder_url}
                    target="_blank"
                  >
                    <Icon type="folder-open" />
                  </Button>
                  <Button
                    onClick={this.handlePreviewUpdate}
                    disabled={this.state.isFetchingPreview}
                  >
                    <Icon type="reload" />
                    Update Preview
                  </Button>
                </Button.Group>

                <SmallText>
                  {lastFetchedDate
                    ? `Preview last updated ${lastFetchedDate.fromNow()}`
                    : "The Package has never been synced before!"}
                </SmallText>
                <SmallText>
                  <a
                    href={this.state.package.metadata.google_drive!.folder_url}
                    target="_blank"
                  >
                    See folder in Google Drive
                  </a>
                </SmallText>

                <Divider />

                <SubHeader>VERSIONS</SubHeader>

                <VersionTimeline
                  committedVersions={this.state.versions}
                  selectedVersionNumber={this.state.selectedVersion}
                  onSelect={async (versionNumber: number) => {
                    const ops = this.props.context.modelOps!;
                    const res = await ops.getPackageDetailsWithVersion(
                      this.props.context.selectedPackageSet!,
                      this.state.package!.slug,
                      versionNumber
                    );
                    console.log(`Version ${versionNumber}`, res.data);
                  }}
                />
              </Col>
              <Col span={18}>
                <Route
                  exact
                  path={`${this.props.match!.url}/`}
                  render={() => {
                    return (
                      <Spin spinning={this.state.isFetchingPreview}>
                        <PackagePreviewDisplay
                          cachedProperties={cachedProperties}
                        />
                      </Spin>
                    );
                  }}
                />
              </Col>
            </>
          ) : (
            <Col style={{ textAlign: "center", paddingTop: "100px" }}>
              <Spin size="large" />
            </Col>
          )}
        </Row>
      </>
    );
  }
}
