import React from "react";
import { RouteProps } from "react-router-dom";
import qs from "qs";
import axios from "axios";
import { OAUTH_URL } from "../commons/constants";
import { GlobalState, IGlobalState } from "../providers";
import { history } from "../commons/history";

interface IOAuthCallbackInfo {
  state: string;
  code: string;
  scope: string;
}

interface IUserRepr {
  token: string;
  user: {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
  };
  is_new: boolean;
}

export class LoginCallbackPage extends React.Component<RouteProps> {
  render() {
    return (
      <GlobalState.Consumer>
        {context => (
          <LoginCallbackPageInternal {...this.props} context={context} />
        )}
      </GlobalState.Consumer>
    );
  }
}

export class LoginCallbackPageInternal extends React.Component<
  RouteProps & { context: IGlobalState }
> {
  async componentDidMount() {
    const query = qs.parse(this.props.location!.search, {
      ignoreQueryPrefix: true
    }) as unknown as IOAuthCallbackInfo;
    console.log(query);
    try {
      const userInfoRes = await axios.get(OAUTH_URL, {
        params: query
      });

      const redirectURL = userInfoRes.data.redirect_url;

      if (redirectURL) {
        // We need a second log in because of missing credentials
        window.open(redirectURL, "_self");
      } else {
        const userRepr = userInfoRes.data as IUserRepr;

        await this.props.context.updateUser({
          id: userRepr.user.id,
          username: userRepr.user.username,
          firstName: userRepr.user.first_name,
          lastName: userRepr.user.last_name,
          token: userRepr.token
        });
        await this.props.context.refreshStateFromLocalStorage();
        history.push("/");
      }
    } catch (e) {
      console.error(e);
      // Reattempt login
      const resJSON = (await axios.get(OAUTH_URL)).data;
      let redirectURL = resJSON["redirect_url"] as string;
      window.open(redirectURL, "_self");
    }
  }
  render() {
    return <div />;
  }
}
