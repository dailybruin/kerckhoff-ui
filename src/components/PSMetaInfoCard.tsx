import { Button, Card, Icon, Input } from "antd";
import React from "react";
import styled from "styled-components";
import { IPackageSet } from "../commons/interfaces";
import { IGlobalState } from "../providers";

const ContextHeader = styled.div`
  font-weight: bold;
  padding-bottom: 0.5rem;
`;

const WarnText = styled.p`
  color: red;
  font-weight: bold;
`;

interface IMetaInfoCardState {
  edit: boolean;
  gdrive_url?: string;
  gdrive_id?: string;
}

export class MetaInfoCard extends React.Component<
  { ps: IPackageSet } & { context: IGlobalState },
  IMetaInfoCardState
> {
  constructor(props: any) {
    super(props);
    this.state = {
      edit: false,
      gdrive_url: undefined,
      gdrive_id: undefined,
    };
  }

  async componentDidMount() {
    const gdrive = this.props.ps.metadata.google_drive;

    this.setState({
      edit: !!!gdrive,
      gdrive_id: gdrive
        ? this.props.ps.metadata.google_drive
          ? this.props.ps.metadata.google_drive.folder_id
          : undefined
        : undefined,
      gdrive_url: gdrive
        ? this.props.ps.metadata.google_drive
          ? this.props.ps.metadata.google_drive.folder_url
          : undefined
        : undefined
    });
  }

  async componentDidUpdate(
    prevProps: { ps: IPackageSet } & { context: IGlobalState }
  ) {
    if (prevProps.ps.id !== this.props.ps.id) {
      this.componentDidMount();
    }
  }

  gdriveIsValid(): boolean {
    return !!this.state.gdrive_id && !!this.state.gdrive_url;
  }

  toggleEdit = () => {
    this.setState({
      edit: !this.state.edit
    });
  };

  handleChange = (key: string) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const target = event.target;
    const value = target.value;

    this.setState({
      [key]: value
    } as any);
  };

  handleUrlUpdate = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({
      gdrive_url: event.target.value,
    });

    try {
      const url = new URL(event.target.value);
      const id = url.pathname.split("/").pop();
      this.setState({
        gdrive_id: id,
      });
    } catch {
      this.setState({
        gdrive_id: undefined,
      });
    }
  };

  handleSave = async () => {
    const response = await this.props.context.modelOps!.updatePackageSet(
      this.props.ps,
      {
        metadata: {
          google_drive: {
            folder_id: this.state.gdrive_id!,
            folder_url: this.state.gdrive_url!
          }
        }
      }
    );
    this.props.context.syncPackageSets();

    console.log(`Successfully updated package set: ${this.props.ps.slug}!`);
    console.log(response);

    this.toggleEdit();
  };

  render() {
    {
      return (
        <Card
          size="small"
          title={
            <>
              Source Information{" "}
              <a onClick={this.toggleEdit}>
                <Icon
                  style={{ float: "right", marginTop: "0.25em" }}
                  type="edit"
                />
              </a>
            </>
          }
        >
          <ContextHeader>
            <Icon type="google" />
            {"  "}Google Drive
            <a
              target="_blank"
              href={
                this.props.ps.metadata.google_drive
                  ? this.props.ps.metadata.google_drive.folder_url
                  : undefined
              }
            >
              
              <Icon
                style={{ float: "right", paddingTop: "0.25em" }}
                type="folder-open"
              />
              
            </a>
          </ContextHeader>

          {/* Do not display "Google Drive configured" after save is clicked or if previously used */}
          {(!(this.props.ps.metadata.google_drive)) && (
            <WarnText>Google Drive is not configured!</WarnText>
          )}
          
          <Input
            onChange={this.handleUrlUpdate}
            style={{ marginBottom: "0.5rem" }}
            placeholder="Folder URL"
            value={this.state.gdrive_url}
            disabled={!this.state.edit}
          />

          {this.state.edit && !this.gdriveIsValid() && (
            <p>Please enter a valid URL!</p>
          )}
          
          {this.state.edit && (
            <Button
              size="small"
              disabled={!this.gdriveIsValid()}
              onClick={this.handleSave}
            >
              Save
            </Button>
          )}
        </Card>
      );
    }
  }
}
