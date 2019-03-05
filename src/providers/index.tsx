import React from "react";
import { IUser, IPackageSetResponse, IPackageSet } from "../commons/interfaces";
import {
  OAUTH_LOCAL_STORAGE_KEY,
  KERCKHOFF_URL,
  API_BASE
} from "../commons/constants";
import Axios, { AxiosInstance } from "axios";
import { message } from "antd";
import { ModelOperations } from "../api/ModelOperations";

export const GlobalState = (React.createContext(
  {}
) as unknown) as React.Context<IGlobalState>;

export interface IGlobalState {
  user?: Partial<IUser>;
  authenticatedAxios?: AxiosInstance;
  packageSets?: IPackageSet[];
  selectedPackageSet?: IPackageSet;
  modelOps?: ModelOperations;
  updateUser: (info: Partial<IUser>) => void;
  syncPackageSets: () => Promise<void>;
}

const createAuthenticatedAxios = (token: string) => {
  const axios = Axios.create({
    baseURL: API_BASE,
    headers: { Authorization: "Token " + token }
  });

  axios.interceptors.response.use(undefined, error => {
    if (!error.response) {
      message.error("An unknown error has occurred.");
      console.error(error);
    }
  });

  return axios;
};

export class GlobalStateWrapper extends React.Component<{}, IGlobalState> {
  constructor(props: any) {
    super(props);
    this.state = {
      updateUser: this.updateUser,
      syncPackageSets: this.syncPackageSets
    };
  }

  syncPackageSets = async () => {
    const axios = this.state.authenticatedAxios;
    if (axios) {
      const results = await axios.get<IPackageSetResponse>("/package-sets/");
      console.log("Found packagesets: ", results.data.results);
      const newPackageSet = this.state.selectedPackageSet
        ? results.data.results.find(
            ps => ps.slug === this.state.selectedPackageSet!.slug
          )
        : results.data.results[0]
        ? results.data.results[0]
        : undefined;
      this.setState({
        packageSets: results.data.results,
        selectedPackageSet: newPackageSet
      });
    } else {
      console.error("Cannot sync packagesets when not logged in!");
    }
  };

  updateUser = (info: Partial<IUser>) => {
    const newUser = {
      ...(this.state.user || {}),
      ...info
    };
    const axios = createAuthenticatedAxios(newUser.token!);
    localStorage.setItem(OAUTH_LOCAL_STORAGE_KEY, JSON.stringify(newUser));
    this.setState({
      user: newUser,
      authenticatedAxios: axios,
      modelOps: new ModelOperations(axios)
    });
  };

  componentDidMount() {
    const loginJSON = localStorage.getItem(OAUTH_LOCAL_STORAGE_KEY);
    if (loginJSON) {
      try {
        const loginData = JSON.parse(loginJSON) as IUser;
        console.log("User data LOADED:", loginData);
        const axios = createAuthenticatedAxios(loginData.token!);
        this.setState(
          {
            user: loginData,
            authenticatedAxios: axios,
            modelOps: new ModelOperations(axios)
          },
          () => {
            this.syncPackageSets().catch(err => {
              console.error(err);
            });
          }
        );
      } catch {}
    } else {
      console.log("User is not logged in.");
    }
  }

  render() {
    return (
      <GlobalState.Provider value={this.state}>
        {this.props.children}
      </GlobalState.Provider>
    );
  }
}
