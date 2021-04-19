import { Col, Row, Divider, Button, Icon, Table } from "antd";
import React from "react";
import { RouteProps, RouteChildrenProps } from "react-router";
import { IPackage, IResponseUser } from "../commons/interfaces";
import { GlobalState, IGlobalState } from "../providers";
import { MetaInfoCard } from "../components/PSMetaInfoCard";
import { IntegrationsInfoCard } from "../components/PSIntegrationsInfoCard";
import styled from "styled-components";
import { PackageCard } from "../components/PackageCard";
import {
  ScrollyBox,
  ScrollyItem,
  SubHeader,
  ScrollyRow
} from "../components/UIFragments";
import { Link } from "react-router-dom";
import Column from "antd/lib/table/Column";
import { create } from "lodash";

export class Homepage extends React.Component<RouteChildrenProps> {
  render() {
    return (
      <GlobalState.Consumer>
        {context => <HomepageInternal {...this.props} context={context} />}
      </GlobalState.Consumer>
    );
  }
}

export class HomepageInternal extends React.Component<
  RouteChildrenProps & { context: IGlobalState },
  {
    displayedPackages: IPackage[];
    is404: boolean;
  }
> {
  constructor(props: any) {
    super(props);
    this.state = { displayedPackages: [], is404: false };
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
      this.syncPackages();
    }
  }

  componentDidMount() {
    this.syncPackages();
  }

  async syncPackages(page = 1) {
    const ops = this.props.context.modelOps;
    const ps = this.props.context.packageSets;

    const params: any = this.props.match!.params;
    const currentPackageSetSlug = params.packageSetId;

    if (ops && ps) {
      const currentPs = currentPackageSetSlug
        ? await this.props.context.setPackageSet(currentPackageSetSlug)
        : this.props.context.selectedPackageSet;

      if (ps) {
        const packageResponse = await ops.getPackages(currentPs!);
        console.log("Got packages:", packageResponse);
        this.setState({
          displayedPackages: packageResponse.data.results
        });
      } else {
        this.setState({
          is404: true
        });
      }
    }
  }

  renderPackageCards = () => {
    if (this.state.displayedPackages) {
      return (
        <ScrollyRow>
          {this.state.displayedPackages.map(p => {
            return (
              <ScrollyItem key={p.id}>
                <Link
                  to={`/${this.props.context.selectedPackageSet!.slug}/${
                    p.slug
                  }`}
                >
                  <PackageCard package={p} />
                </Link>
              </ScrollyItem>
            );
          })}
        </ScrollyRow>
      );
    } else {
      return <h2>Loading...</h2>;
    }
  };

  fetchPackages = async () => {
    const ops = this.props.context.modelOps;
    const ps = this.props.context.selectedPackageSet;
    if (ops && ps) {
      await ops.fetchPackagesForPackageSet(ps);
      this.syncPackages();
    }
  };

  render() {
    let pkgs = this.state.displayedPackages;
    console.log(pkgs);

    // Set up table for ALL PACKAGES
    let tableColumns = [
      // Package Name
      {
        title: "Package Name",
        dataIndex: "slug",
        key: "slug",
        render: (pkgName: string) => // Render the package name as a link (following above format)
          <Link to={`/${this.props.context.selectedPackageSet!.slug}/${pkgName}`}>
            {pkgName}
          </Link>
      },
      // Creator
      {
        title: "Created By",
        dataIndex: "created_by",
        key: "created_by",
        render: (createdByObj: IResponseUser) => // Format created by name as Last, First
          <>{createdByObj.last_name + ", " + createdByObj.first_name}</>
      },
      // Last Update
      {
        title: "Last Updated",
        dataIndex: "updated_at",
        key: "updated_at",
        render: (lastUpdate: string) => // Format date
          <>{dateFormatter(new Date(lastUpdate))}</>
      }
    ];

    // Formats date in ISO format
    function dateFormatter(date: Date): string {
      let dateTimeString = "";

      // Date portion
      let isoStr = date.toISOString();
      dateTimeString += isoStr.substring(0, isoStr.lastIndexOf('T'));

      dateTimeString += " ";

      // Time portion
      let timeStr = date.toTimeString();
      dateTimeString += timeStr.split(' ')[0];

      return dateTimeString;
    }

    // Render and return
    return (
      <>
        {this.props.context.selectedPackageSet ? (
          <Row gutter={32}>
            <Col span={6} style={{ maxWidth: "300px" }}>
              <SubHeader>PACKAGESET INFO</SubHeader>
              <h3>{this.props.context.selectedPackageSet!.slug}</h3>

              <Divider />

              <Button
                onClick={this.fetchPackages}
                style={{ maxWidth: "200px" }}
                block
              >
                <Icon type="reload" />
                Fetch New Packages
              </Button>

              <Divider />
              <MetaInfoCard
                context={this.props.context}
                ps={this.props.context.selectedPackageSet}
              />
              <div style={{ marginBottom: "1em" }} />
              <IntegrationsInfoCard
                context={this.props.context}
                ps={this.props.context.selectedPackageSet}
              />
            </Col>
            <Col span={18}>
              {this.state.displayedPackages.length > 0 ? (
                <>
                  <h2>Recently Updated</h2>
                  {this.renderPackageCards()}

                  <Divider />

                  <h2>My Packages</h2>
                  {this.renderPackageCards()}

                  <Divider />
                  <h2>All Packages</h2>
                  {/* <p>TODO</p> */}
                  {<Table dataSource={this.state.displayedPackages} columns={tableColumns}>
                    <Column />
                  </Table>}
                </>
              ) : (
                <h2>No Packages are found.</h2>
              )}
            </Col>
          </Row>
        ) : (
          <h2>
            {this.props.context.authenticatedAxios
              ? "No Package Sets found!"
              : "Log In First!"}
          </h2>
        )}
        {/* <DUMMY_DO_NOT_USE_OR_YOU_WILL_BE_FIRED_DiffModal /> */}
      </>
    );
  }
}

export default Homepage;
