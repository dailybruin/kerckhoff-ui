import { AxiosInstance } from "axios";
import {
  IPackageSet,
  IPackageSetInit,
  IPackageResponse,
  IPackage,
  IPackageSetResponse,
  IPackageVersionResponse,
  IPackageVersionWithVersionData,
  IPackageWithVersion,
  ICreateVersionPayload,
  IPackageSetDetailed,
  IIntegration,
  IIntegrationCreation,
  IIntegrationLinkResponse
} from "../commons/interfaces";

type PackageOrderingField =
  | "slug"
  | "last_fetched_date"
  | "created_at"
  | "updated_at";

export class ModelOperations {
  private axios: AxiosInstance;

  constructor(axios: AxiosInstance) {
    this.axios = axios;
  }

  async updatePackageSet(ps: IPackageSet, patch: Partial<IPackageSet>) {
    return this.axios.patch<IPackageSet>(`/package-sets/${ps.slug}/`, patch);
  }

  async fetchPackagesForPackageSet(ps: IPackageSet) {
    return this.axios.post<IPackageResponse>(
      `/package-sets/${ps.slug}/sync_gdrive/`
    );
  }

  async getPackages(
    ps: IPackageSet,
    ordering: PackageOrderingField = "updated_at",
    ascending: boolean = true,  // Sort ascending by default (a-z)
    page: number = 1              // Default page is page 1
  ) {
    return this.axios.get<IPackageResponse>(
      `/package-sets/${ps.slug}/packages/`,
      { 
        params: { 
          ordering: `${ascending ? "" : "-"}${ordering}`,
          page: `${page}`
        } 
      }
    );
  }

  async getPackageDetails(ps: IPackageSet, packageSlug: string) {
    return this.axios.get<IPackage>(
      `/package-sets/${ps.slug}/packages/${packageSlug}/`
    );
  }

  async getPackageDetailsWithVersion(
    ps: IPackageSet,
    packageSlug: string,
    version: number
  ) {
    return this.axios.get<IPackageWithVersion>(
      `/package-sets/${ps.slug}/packages/${packageSlug}/?version=${version}`
    );
  }

  async getPackageVersions(ps: IPackageSet, packageSlug: string) {
    return this.axios.get<IPackageVersionResponse>(
      `/package-sets/${ps.slug}/packages/${packageSlug}/versions/`
    );
  }

  async updatePackageCache(ps: IPackageSet, p: IPackage) {
    return this.axios.post<IPackage>(
      `/package-sets/${ps.slug}/packages/${p.slug}/preview/`
    );
  }

  async createPackageVersion(
    ps: IPackageSet,
    p: IPackage,
    payload: ICreateVersionPayload
  ) {
    return this.axios.post<IPackage>(
      `/package-sets/${ps.slug}/packages/${p.slug}/snapshot/`,
      payload
    );
  }

  async publishPackage(ps: IPackageSet, p: IPackage) {
    return this.axios.post(
      `/package-sets/${ps.slug}/packages/${p.slug}/publish/`
    );
  }

  async createPackageSet(ps: IPackageSetInit) {
    return this.axios.post<IPackage>(`/package-sets/`, ps);
  }

  async getPackageSets(ordering: PackageOrderingField = "slug") {
    return this.axios.get<IPackageSetResponse>(`/package-sets/`, {
      params: { ordering }
    });
  }

  async getPackageSetDetailed(slug: string) {
    return this.axios.get<IPackageSetDetailed>(`/package-sets/${slug}/`);
  }

  async createPackageSetIntegration(
    ps: IPackageSet,
    integration: IIntegrationCreation
  ) {
    return this.axios.post<IIntegration>(
      `/package-sets/${ps.slug}/integration/`,
      integration
    );
  }

  async getIntegrationOAuthLink(ps: IPackageSet, integration: IIntegration) {
    return this.axios.get<IIntegrationLinkResponse>(
      `/integrations/?ps-slug=${ps.id}&id=${integration.id}`
    );
  }
}
