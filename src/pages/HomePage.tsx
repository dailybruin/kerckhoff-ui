import { Col, Row, Divider, Button, Icon } from "antd";
import React, { ChangeEvent, useState } from "react";
import { RouteProps, RouteChildrenProps } from "react-router";
import { IPackage, IUser, IResponseUser } from "../commons/interfaces";
import { GlobalState, IGlobalState } from "../providers";
import { MetaInfoCard } from "../components/PSMetaInfoCard";
import { IntegrationsInfoCard } from "../components/PSIntegrationsInfoCard";
import styled from "styled-components";
import { PackageCard } from "../components/PackageCard";
import { AllPackagesTable, PackageSetInfo } from "../components/AllPackagesTable";
import {
  ScrollyBox,
  ScrollyItem,
  SubHeader,
  ScrollyRow
} from "../components/UIFragments";
import { Link } from "react-router-dom";
import "./HomePage.css";

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
    maxNumOfRecentlyUpdatedPackagesToShow: number;
    totalPackagesInSet: number
  }
> {
  constructor(props: any) {
    super(props);
    this.state = { displayedPackages: [], is404: false, maxNumOfRecentlyUpdatedPackagesToShow: 10, totalPackagesInSet: 0 };
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

  async syncPackages(page?: number, ascending?: boolean) {
    console.log(`Now loading page ${page} of package set`);

    const ops = this.props.context.modelOps;
    const ps = this.props.context.packageSets;

    const params: any = this.props.match!.params;
    const currentPackageSetSlug = params.packageSetId;

    if (ops && ps) {
      const currentPs = currentPackageSetSlug
        ? await this.props.context.setPackageSet(currentPackageSetSlug)
        : this.props.context.selectedPackageSet;

      if (ps) {
        // Get the correct page
        let packageResponse;
        if (page === undefined)
          packageResponse = await ops.getPackages(currentPs!, undefined, ascending, undefined);
        else
          packageResponse = await ops.getPackages(currentPs!, undefined, ascending, page);
        
        console.log("Got packages:", packageResponse);

        this.setState({
          displayedPackages: packageResponse.data.results,
          totalPackagesInSet: packageResponse.data.count
        });
      } else {
        this.setState({
          is404: true
        }); 
      }
    }
  }

  // Renders all packages that were created by the user
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
      if (creator.id === currentUser.id) {
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

  // Renders N of the most recently updated packages
  renderRecentlyUpdatedPackages(): JSX.Element {
    let packages = this.state.displayedPackages;
    const MAX_NUMBER_OF_PACKAGES_TO_SHOW = this.state.maxNumOfRecentlyUpdatedPackagesToShow;  // Can change this, default 10

    // Straight return if there are no packages to display
    if (!packages)
      return <p>Loading...</p>;

    // Sort packages by date - this will be very inefficient if there are many packages
    packages = packages.sort((a: IPackage, b: IPackage): number => {
      let aDate = new Date((a as any).updated_at), bDate = new Date((b as any).updated_at); // Type def doesn't have key 'updated_at', but it exists

      if (aDate < bDate)      // aDate is before bDate, move to back
        return 1;
      else if (aDate > bDate) // aDate is after bDate, move to front
        return -1;
      else return 0;
    });

    // Display the first MAX_NUMBER_OF_PACKAGES_TO_SHOW packages of the sorted array
    let packagesToDisplay: JSX.Element[] = [];
    let numPackages = packages.length;
    for (let i = 0; i < numPackages && i < MAX_NUMBER_OF_PACKAGES_TO_SHOW; i++) {
      const pkg = packages[i];

      // Create package element
      let pkgElement = (
        <ScrollyItem key={pkg.id}>
          <Link to={`/${this.props.context.selectedPackageSet!.slug}/${pkg.slug}`}>
            <PackageCard package={pkg} />
          </Link>
        </ScrollyItem>
      );

      packagesToDisplay.push(pkgElement);
    }

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

  // Set up AllPackagesTable
  renderAllPackagesTable(): JSX.Element {
    let packageSetInfo = {
      packageSetName: this.props.context.selectedPackageSet!.slug,
      packageSetSize: this.state.totalPackagesInSet
    } as PackageSetInfo;

    /*
      AllPackagesTable component displays the "All Packages" section as an antd table
      packageInfo: IPackage[] - the packages to display
      packageSetName: string - the directory which these packages are stored under, e.g. for /test/zinnia.unchartedterritory, pass "test" as the prop
    */
    return (<AllPackagesTable packages={this.state.displayedPackages} packageSetInfo={packageSetInfo} pageChangeHandler={this.fetchPackages} />);
  }

  fetchPackages = async (pages?: number, ascending?: boolean) => {
    if (pages === undefined)
      pages = 1;

    const ops = this.props.context.modelOps;
    const ps = this.props.context.selectedPackageSet;
    if (ops && ps) {
      await ops.fetchPackagesForPackageSet(ps);
      this.syncPackages(pages, ascending);
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
                onClick={() => this.fetchPackages()}
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
                  {/*
                    All Packages
                    Renders all packages in the package set; handles pagination
                  */}
                  <h2>All Packages</h2>
                  {this.renderAllPackagesTable()}
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

/*
Temporarily put this here
                  // {/*
                  //  Recently Updated Packages 
                  //  Defaults to showing the 10 last updated packages
                  //  Can be changed via dropdown box
                  // }
                  <h2>Recently Updated</h2> // {/* Set the threshold for "Recently Updated in the function" }
                  {this.renderRecentlyUpdatedPackages()}
                  {/* Let user choose how many recently updated packages to show }
                  <div className={"line-under-scrolly"}>
                    <p className={"line-label"}>Number of packages to display:</p>
                    <select onChange={(e) => this.setState({maxNumOfRecentlyUpdatedPackagesToShow: parseInt(e.target.value)})}>
                      <option value="5">5</option>
                      <option value="10" selected>10</option>
                      <option value="20">20</option>
                      <option value="50">50</option>
                    </select>
                  </div>

                  <Divider />

                  {/* 
                    My Packages
                    Renders packages created by the current user
                  }
                  <h2>My Packages</h2>
                  {this.renderMyPackages()}

                  <Divider /> 
*/