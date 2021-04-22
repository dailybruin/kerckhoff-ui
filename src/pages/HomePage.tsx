import { Col, Row, Divider, Button, Icon } from "antd";
import React from "react";
import { RouteProps, RouteChildrenProps } from "react-router";
import { IPackage, IUser, IResponseUser } from "../commons/interfaces";
import { GlobalState, IGlobalState } from "../providers";
import { MetaInfoCard } from "../components/PSMetaInfoCard";
import { IntegrationsInfoCard } from "../components/PSIntegrationsInfoCard";
import styled from "styled-components";
import { PackageCard } from "../components/PackageCard";
import { AllPackagesTable } from "../components/AllPackagesTable";
import {
  ScrollyBox,
  ScrollyItem,
  SubHeader,
  ScrollyRow
} from "../components/UIFragments";
import { Link } from "react-router-dom";

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

  renderMyPackages(): JSX.Element {
    const PACKAGES = this.state.displayedPackages;

    // Straight return if there are no packages to display
    if (!PACKAGES)
      return <p>Loading...</p>;

    // Figure out which packages to display and render them accordingly
    let packagesToDisplay: JSX.Element[] = [];
    PACKAGES.forEach(pkg => {
      // Get the user who created the package, and see if it matches the current user
      let creator = (pkg as any).created_by as IResponseUser; // IPackage type doesn't define a 'created_by' field, but it's there
      let currentUser = this.props.context.user as IUser;

      // Only display if the user is the same
      if (creator.id == currentUser.id) {
        // Create package element
        let pkgElement = (
          <ScrollyItem key={pkg.id}>
            <Link to={`/${this.props.context.selectedPackageSet!.slug}/${pkg.slug}`}>
              <PackageCard package={pkg} />
            </Link>
          </ScrollyItem>
        );

        // Add it to the array of packages to display
        packagesToDisplay.push(pkgElement);
      }
    });

    // There may be a chance that all the packages are old
    if (packagesToDisplay.length > 0) {
      return (
        <ScrollyRow>
          {packagesToDisplay}
        </ScrollyRow>
      );
    }
    else return <p>No Packages Found</p>
  }

  renderRecentlyUpdatedPackages(): JSX.Element {
    const PACKAGES = this.state.displayedPackages;
    const MAX_TIME_DIFFERENCE_TO_SHOW = 7 * 1000 * 60 * 60 * 24;  // The first number is in days

    // Straight return if there are no packages to display
    if (!PACKAGES)
      return <p>Loading...</p>;

    // Figure out which packages to display and render them accordingly
    let packagesToDisplay: JSX.Element[] = [];
    PACKAGES.forEach(pkg => {
      // Get current time and the time each package was last updated
      let lastUpdate = new Date((pkg as any).updated_at);
      let currentTime = new Date();
      let timeDifference = currentTime.getTime() - lastUpdate.getTime();

      // Only show if time difference is less than or equal to threshold
      if (timeDifference <= MAX_TIME_DIFFERENCE_TO_SHOW) {
        // Create package element
        let pkgElement = (
          <ScrollyItem key={pkg.id}>
            <Link to={`/${this.props.context.selectedPackageSet!.slug}/${pkg.slug}`}>
              <PackageCard package={pkg} />
            </Link>
          </ScrollyItem>
        );

        // Add it to the array of packages to display
        packagesToDisplay.push(pkgElement);
      }
    });

    // There may be a chance that all the packages are old
    if (packagesToDisplay.length > 0) {
      return (
        <ScrollyRow>
          {packagesToDisplay}
        </ScrollyRow>
      );
    }
    else return <p>No Recently Updated Packages</p>
  }

  /* renderPackageCards = () => {
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
  }; */

  fetchPackages = async () => {
    const ops = this.props.context.modelOps;
    const ps = this.props.context.selectedPackageSet;
    if (ops && ps) {
      await ops.fetchPackagesForPackageSet(ps);
      this.syncPackages();
    }
  };

  render() {
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
                  <h2>Recently Updated</h2> {/* Set the threshold for "Recently Updated in the function" */}
                  {this.renderRecentlyUpdatedPackages()}

                  <Divider />

                  <h2>My Packages</h2>  {/* Renders packages created by the current user */}
                  {this.renderMyPackages()}

                  <Divider />
                  <h2>All Packages</h2>
                  {/*
                    AllPackagesTable component displays the "All Packages" section as an antd table
                    packages: IPackage[] - the packages to display
                    linkDirectory: string - the directory which these packages are stored under, e.g. for /test/zinnia.unchartedterritory, pass "test" as the prop
                  */}
                  <AllPackagesTable packages={this.state.displayedPackages} linkDirectory={this.props.context.selectedPackageSet!.slug} />
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
