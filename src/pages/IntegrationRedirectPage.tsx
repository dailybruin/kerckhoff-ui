import React from "react";
import { RouteProps } from "react-router-dom";
import qs from "qs";
import axios from "axios";
import { INTEGRATION_OAUTH_URL } from "../commons/constants";
import { GlobalState, IGlobalState } from "../providers";
import { history } from "../commons/history";
import { notifyError } from "../commons/notify";

interface IOAuthCallbackInfo {
  state: string;
  code: string;
}

export class IntegrationRedirectPage extends React.Component<RouteProps> {
  render() {
    return (
      <GlobalState.Consumer>
        {context => (
          <IntegrationRedirectPageInternal {...this.props} context={context} />
        )}
      </GlobalState.Consumer>
    );
  }
}

export class IntegrationRedirectPageInternal extends React.Component<
  RouteProps & { context: IGlobalState }
> {
  async componentDidMount() {
    const query = qs.parse(this.props.location!.search, {
      ignoreQueryPrefix: true
    }) as unknown as IOAuthCallbackInfo;

    console.log(query);

    try {
      await this.props.context.refreshStateFromLocalStorage();

      const response = await this.props.context.authenticatedAxios!.get(
        INTEGRATION_OAUTH_URL,
        {
          params: query
        }
      );

      const redirectSlug = response.data.packageset_slug;
      await this.props.context.setPackageSet(redirectSlug, true);
      history.push(`/${redirectSlug}`);
    } catch (e) {
      console.error(e);
      notifyError("Failed to link integration!");
      history.push("/");
    }
  }
  render() {
    return <div />;
  }
}
