import React, { Component, ChangeEvent } from "react";
import ReactDiffViewer from "react-diff-viewer";
import {
  IPackage,
  ICachedPackageItem,
  IPackageVersionWithVersionData,
  IPackageItemData
} from "../commons/interfaces";
import { Tree, Modal, Input, Tag } from "antd";
const { TreeNode } = Tree;

interface IDiffModalProps {
  cachedPackage: IPackage;
  latestCommittedVersion?: IPackageVersionWithVersionData;
  isOpen: boolean;
  setOpen: (cond: boolean) => void;
  handleSubmit: (
    title: string,
    description: string,
    selectedFiles: string[]
  ) => Promise<void>;
  onSubmit: () => void;
}

/**
 * Basic design:
 *
 * We will attempt to group the items based on their types under preview.
 * If a file is gone in preview, it would be grouped under their type in commited version.
 *
 * If a file is added, we only display the added.
 * If a file is deleted, we display nothing.
 * If a file has changed type (same name), we only display the new version.
 */

interface IDiffModalState {
  treeView: IDiffTreeView;
  oldMap: Map<string, IPackageItemData>;
  newMap: Map<string, ICachedPackageItem>;
  treeViewItemMap: Map<string, IDiffTreeViewItem>;
  diffedItemTitle: string;
  checkedCategoryTitles: string[]; // category titles for display only, DO NOT TOUCH
  checkedItemTitles: string[];
  notChangedTitles: string[]; // checkedItemTitles + notChangedTitles = items to be included in the new package
  packageVersionTitle: string;
  packageVersionDescription: string;
  isSubmitting: boolean;
}

interface IDiffTreeView {
  images: IDiffTreeViewItem[];
  amls: IDiffTreeViewItem[];
  markdowns: IDiffTreeViewItem[];
  others: IDiffTreeViewItem[];
}

enum DiffItemState {
  DEFAULT, // The file content changed.
  NEW, // The file is new.
  DELETED, // The file is removed in cached version.
  TYPECHANGED // The type of the file is changed.
}

interface IDiffTreeViewItem {
  title: string;
  state: DiffItemState;
}

// ArchieML: diff raw
// Markdown: diff rendered html
// Images: diff thumbnails ()
// Others: no diff

interface IDiffSource {
  old: string;
  new: string;
}

const TextDiff: React.FunctionComponent<IDiffSource> = (props: IDiffSource) => {
  return (
    <ReactDiffViewer
      oldValue={props.old}
      newValue={props.new}
      splitView={true}
    />
  );
};

const ImageDiff: React.FunctionComponent<IDiffSource> = (
  props: IDiffSource
) => {
  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        flexDirection: "column",
        justifyContent: "center"
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-around"
        }}
      >
        <img
          style={{
            maxWidth: "45%",
            objectFit: "cover"
          }}
          src={props.old}
        />
        <div
          style={{
            display: "flex",
            height: "100%",
            flexDirection: "column",
            justifyContent: "center",
            fontSize: "3rem"
          }}
        >
          {" "}
          →{" "}
        </div>
        <img
          style={{
            maxWidth: "45%",
            objectFit: "cover"
          }}
          src={props.new}
        />
      </div>
    </div>
  );
};

enum DataType {
  IMAGE,
  AML,
  MD,
  OTHER
}

function getDataType(item: ICachedPackageItem | IPackageItemData): DataType {
  if (item.format) {
    switch (item.format) {
      case "MD":
        return DataType.MD;
      case "AML":
        return DataType.AML;
      // no default
    }
  }
  switch (item.mimeType) {
    case "image/jpeg":
    case "image/png":
    case "image/svg+xml":
      return DataType.IMAGE;
    default:
      return DataType.OTHER;
  }
  // TODO: maybe add extension mapping?
}

const diffModalinitialState: IDiffModalState = {
  treeView: {
    images: [] as IDiffTreeViewItem[],
    amls: [] as IDiffTreeViewItem[],
    markdowns: [] as IDiffTreeViewItem[],
    others: [] as IDiffTreeViewItem[]
  },
  oldMap: new Map<string, IPackageItemData>(),
  newMap: new Map<string, ICachedPackageItem>(),
  treeViewItemMap: new Map<string, IDiffTreeViewItem>(),
  diffedItemTitle: "",
  checkedCategoryTitles: [],
  checkedItemTitles: [],
  notChangedTitles: [],
  packageVersionTitle: "",
  packageVersionDescription: "",
  isSubmitting: false
};

export class DiffModal extends Component<IDiffModalProps, IDiffModalState> {
  state = diffModalinitialState;

  static populateTreeView(newProps: IDiffModalProps): IDiffModalState {
    /**
     * Display logic:
     *
     * if typed has changed, show in the new type's section with item state set to TYPECHANGED.
     * if file is deleted, show at its original section with item state set to DELETED.
     * if file is new, show at section of its type with item state set to NEW.
     */
    const typeMap = new Map<string, (DataType | null)[]>();
    const oldMap = new Map<string, IPackageItemData>();
    const newMap = new Map<string, ICachedPackageItem>();
    const treeViewItemMap = new Map<string, IDiffTreeViewItem>();

    if (newProps.latestCommittedVersion) {
      for (let item of newProps.latestCommittedVersion.packageitem_set) {
        const packageItemData = item.data;
        typeMap.set(packageItemData.title, [
          getDataType(packageItemData),
          null
        ]);
        oldMap.set(packageItemData.title, packageItemData);
      }
    }

    for (let item of newProps.cachedPackage.cached) {
      if (typeMap.has(item.title)) {
        typeMap.get(item.title)![1] = getDataType(item);
      } else {
        typeMap.set(item.title, [null, getDataType(item)]);
      }
      newMap.set(item.title, item);
    }

    const images: IDiffTreeViewItem[] = [];
    const amls: IDiffTreeViewItem[] = [];
    const markdowns: IDiffTreeViewItem[] = [];
    const others: IDiffTreeViewItem[] = [];

    const notChangedTitles: string[] = [];

    typeMap.forEach((dataTypes, title) => {
      if (dataTypes.length === 2) {
        const itemState =
          dataTypes[0] === dataTypes[1]
            ? DiffItemState.DEFAULT
            : dataTypes[0] === null
            ? DiffItemState.NEW
            : dataTypes[1] === null
            ? DiffItemState.DELETED
            : DiffItemState.TYPECHANGED;

        const newDataType = (dataTypes[1] !== null
          ? dataTypes[1]
          : dataTypes[0])!;

        let listToPush: IDiffTreeViewItem[];
        switch (newDataType) {
          case DataType.IMAGE: {
            // Skip diffing if not changed
            if (
              itemState === DiffItemState.DEFAULT &&
              oldMap.get(title)!.last_modified_date ===
                newMap.get(title)!.last_modified_date
            ) {
              notChangedTitles.push(title);
              return;
            }
            listToPush = images;
            break;
          }
          case DataType.AML: {
            // Skip diffing if not changed
            if (
              itemState === DiffItemState.DEFAULT &&
              oldMap.get(title)!.content_plain.raw ===
                newMap.get(title)!.content_plain.raw
            ) {
              notChangedTitles.push(title);
              return;
            }
            listToPush = amls;
            break;
          }
          case DataType.MD: {
            // Skip diffing if not changed
            if (
              itemState === DiffItemState.DEFAULT &&
              oldMap.get(title)!.content_plain.raw ===
                newMap.get(title)!.content_plain.raw
            ) {
              notChangedTitles.push(title);
              return;
            }
            listToPush = markdowns;
            break;
          }
          default: {
            // Skip diffing if not changed
            if (
              itemState === DiffItemState.DEFAULT &&
              oldMap.get(title)!.content_plain.raw ===
                newMap.get(title)!.content_plain.raw
            ) {
              notChangedTitles.push(title);
              return;
            }
            listToPush = others;
          }
        }

        const treeViewItem: IDiffTreeViewItem = {
          title,
          state: itemState
        };
        listToPush.push(treeViewItem);
        treeViewItemMap.set(title, treeViewItem);
      }
    });

    // Batched update.
    // I'm too lazy to introduce immutability-helper...
    return {
      treeView: {
        images,
        amls,
        markdowns,
        others
      },
      oldMap,
      newMap,
      treeViewItemMap,
      diffedItemTitle: "",
      checkedCategoryTitles: [],
      checkedItemTitles: [],
      notChangedTitles,
      packageVersionDescription: "",
      packageVersionTitle: "",
      isSubmitting: false
    };
  }

  /**
   * getDerivedStateFromProps() is a bit problematic since
   * it would also be invoked on state update...
   *
   * So the laziest way is to ensure this component is REMOVED
   * from page if the user decides to close this Modal, so that
   * it would reload from fresh when the diff between cached and
   * committed is updated.
   */
  componentDidMount() {
    this.setState(DiffModal.populateTreeView(this.props));
  }

  static DUMMY_CATEGORY_MARKER = "$$DUMMY_CATEGORY_MARKER";
  static createDummyMarker(count: number) {
    return `${DiffModal.DUMMY_CATEGORY_MARKER}${count}`;
  }

  updateDiffed = (keys: string[], _event: any) => {
    console.log(keys);
    const maybeTitle = keys[0] || "";
    if (maybeTitle.startsWith(DiffModal.DUMMY_CATEGORY_MARKER)) {
      return; // Do nothing, selecting a parent category
    }
    this.setState({
      diffedItemTitle: keys[0] || ""
    });
  };

  updateChecked = (
    checkedKeys:
      | string[]
      | {
          checked: string[];
          halfChecked: string[];
        }
  ) => {
    if (!(checkedKeys instanceof Array)) {
      console.error("Should not happen");
      return;
    }

    let checkedCategoryTitles = [] as string[];
    let checkedItemTitles = [] as string[];
    for (let key of checkedKeys) {
      if (key.startsWith(DiffModal.DUMMY_CATEGORY_MARKER)) {
        checkedCategoryTitles.push(key);
      } else {
        checkedItemTitles.push(key);
      }
    }

    this.setState({
      checkedCategoryTitles,
      checkedItemTitles
    });
  };

  closeModal = () => {
    this.props.setOpen(false);
  };

  static _renderDeleted(): JSX.Element {
    return (
      <div
        style={{
          display: "flex",
          height: "100%",
          flexDirection: "column",
          justifyContent: "center"
        }}
      >
        <div
          style={{
            textAlign: "center",
            width: "100%",
            margin: "auto",
            fontSize: "3rem",
            color: "lightgray"
          }}
        >
          FILE DELETED
        </div>
      </div>
    );
  }

  renderDiffAsImage(treeViewItem: IDiffTreeViewItem): JSX.Element {
    switch (treeViewItem.state) {
      case DiffItemState.DELETED:
        return DiffModal._renderDeleted();
      case DiffItemState.NEW:
      case DiffItemState.TYPECHANGED:
        const imageURL = this.state.newMap.get(treeViewItem.title)!
          .thumbnail_link;
        return (
          <div
            style={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-around"
            }}
          >
            <img
              style={{
                width: "80%",
                margin: "auto"
              }}
              src={imageURL}
            />
          </div>
        );
      default:
        const oldImageURL = this.state.oldMap.get(treeViewItem.title)!
          .src_large;
        const newImageURL = this.state.newMap.get(treeViewItem.title)!
          .thumbnail_link;
        return <ImageDiff old={oldImageURL} new={newImageURL} />;
    }
  }

  renderDiffAsAML(treeViewItem: IDiffTreeViewItem): JSX.Element {
    switch (treeViewItem.state) {
      case DiffItemState.DELETED:
        return DiffModal._renderDeleted();
      case DiffItemState.NEW:
      case DiffItemState.TYPECHANGED:
        const AMLText = this.state.newMap.get(treeViewItem.title)!.content_plain
          .raw;
        return <TextDiff old={""} new={AMLText} />;
      default:
        const oldAMLText = this.state.oldMap.get(treeViewItem.title)!
          .content_plain.raw;
        const newAMLText = this.state.newMap.get(treeViewItem.title)!
          .content_plain.raw;
        return <TextDiff old={oldAMLText} new={newAMLText} />;
    }
  }

  renderDiffAsMarkdown(treeViewItem: IDiffTreeViewItem): JSX.Element {
    // None of the HTML rendered diff packages work...
    return this.renderDiffAsAML(treeViewItem);
  }

  renderDiffAsOther(treeViewItem: IDiffTreeViewItem): JSX.Element {
    switch (treeViewItem.state) {
      case DiffItemState.DELETED:
        return DiffModal._renderDeleted();
      default:
        // No diff
        return (
          <div
            style={{
              display: "flex",
              height: "100%",
              flexDirection: "column",
              justifyContent: "center"
            }}
          >
            <div
              style={{
                textAlign: "center",
                width: "100%",
                margin: "auto",
                fontSize: "3rem",
                color: "lightgray"
              }}
            >
              NO PREVIEW AVAILABLE
            </div>
          </div>
        );
    }
  }

  canSubmit(): boolean {
    return (
      this.state.packageVersionDescription.trim().length > 0 &&
      this.state.packageVersionTitle.trim().length > 0 &&
      this.state.checkedItemTitles.length > 0
    );
  }

  renderDiffByTitle(title: string): JSX.Element | null {
    const packageItem =
      this.state.newMap.get(title) || this.state.oldMap.get(title);
    if (!packageItem) {
      return null;
    }
    const treeViewItem = this.state.treeViewItemMap.get(title)!;
    switch (getDataType(packageItem)) {
      case DataType.MD:
        return this.renderDiffAsMarkdown(treeViewItem);
      case DataType.AML:
        return this.renderDiffAsAML(treeViewItem);
      case DataType.IMAGE:
        return this.renderDiffAsImage(treeViewItem);
      default:
        return this.renderDiffAsOther(treeViewItem);
    }
  }

  handleInputChange = (
    field: "packageVersionTitle" | "packageVersionDescription"
  ) => (evt: ChangeEvent<HTMLInputElement>) => {
    this.setState({
      [field]: evt.target.value
    } as Pick<IDiffModalState, "packageVersionTitle" | "packageVersionDescription">);
  };

  handleSubmit = async () => {
    // TODO: fill this to connect to API
    // checkedItemTitles contains the names of the items to update.
    // Use these names as keys into state.oldMap and state.newMap
    // to get the corresponding packages.
    // If you don't want to find the change type again yourself,
    // use the keys to get items in state.treeViewItemMap.
    // Each of these items would have a field `treeViewItem.state`
    // for you to inspect.
    this.setState({
      isSubmitting: true
    });

    await this.props.handleSubmit(
      this.state.packageVersionTitle,
      this.state.packageVersionDescription,
      this.state.checkedItemTitles
    );

    this.setState({
      isSubmitting: false
    });

    this.props.setOpen(false);
    this.props.onSubmit();
  };

  renderTitle = (title: string) => {
    const treeViewItem = this.state.treeViewItemMap.get(title);
    if (treeViewItem) {
      switch (treeViewItem.state) {
        case DiffItemState.NEW:
          return (
            <>
              <Tag color="blue">NEW</Tag> <span>{title}</span>
            </>
          );
        default:
          return (
            <>
              <Tag color="orange">UPDATED</Tag> <span>{title}</span>
            </>
          );
      }
    } else {
      return title;
    }
  };

  render() {
    return (
      <Modal
        title="Create New Version"
        visible={this.props.isOpen}
        onOk={this.handleSubmit}
        onCancel={this.closeModal}
        bodyStyle={{
          minHeight: "70vh",
          display: "flex",
          flexDirection: "column"
        }}
        width={"80vw"}
        okText="Create"
        okButtonProps={{
          disabled: !this.canSubmit()
        }}
        confirmLoading={this.state.isSubmitting}
      >
        <div style={{ marginBottom: "1em" }}>
          <Input
            size="large"
            placeholder="Enter a title for the new version"
            style={{ fontSize: "1.5em", marginBottom: "0.5em" }}
            value={this.state.packageVersionTitle}
            onChange={this.handleInputChange("packageVersionTitle")}
          />
          <Input
            size="small"
            placeholder="Enter a version description"
            value={this.state.packageVersionDescription}
            onChange={this.handleInputChange("packageVersionDescription")}
          />
        </div>

        <div
          style={{
            display: "flex",
            flex: 1,
            height: "100%"
          }}
        >
          <div
            style={{
              width: "20vw",
              display: "inline-block",
              borderRight: "1px solid lightgray",
              overflowX: "scroll"
            }}
          >
            <h4>Select files to include</h4>
            <Tree
              checkable
              onSelect={this.updateDiffed}
              onCheck={this.updateChecked}
              checkedKeys={this.state.checkedItemTitles.concat(
                this.state.checkedCategoryTitles
              )}
            >
              {this.state.treeView.images.length > 0 ? (
                <TreeNode title="Images" key={DiffModal.createDummyMarker(0)}>
                  {this.state.treeView.images.map(item => (
                    <TreeNode
                      title={this.renderTitle(item.title)}
                      key={item.title}
                      isLeaf
                    />
                  ))}
                </TreeNode>
              ) : (
                <></>
              )}
              {this.state.treeView.amls.length > 0 ? (
                <TreeNode title="AML" key={DiffModal.createDummyMarker(1)}>
                  {this.state.treeView.amls.map(item => (
                    <TreeNode
                      title={this.renderTitle(item.title)}
                      key={item.title}
                      isLeaf
                    />
                  ))}
                </TreeNode>
              ) : (
                <></>
              )}
              {this.state.treeView.markdowns.length > 0 ? (
                <TreeNode title="Markdown" key={DiffModal.createDummyMarker(2)}>
                  {this.state.treeView.markdowns.map(item => (
                    <TreeNode
                      title={this.renderTitle(item.title)}
                      key={item.title}
                      isLeaf
                    />
                  ))}
                </TreeNode>
              ) : (
                <></>
              )}
              {this.state.treeView.others.length > 0 ? (
                <TreeNode title="Others" key={DiffModal.createDummyMarker(3)}>
                  {this.state.treeView.others.map(item => (
                    <TreeNode
                      title={this.renderTitle(item.title)}
                      key={item.title}
                      isLeaf
                    />
                  ))}
                </TreeNode>
              ) : (
                <></>
              )}
              {this.state.notChangedTitles.length > 0 ? (
                <TreeNode
                  title="Unchanged Files"
                  key={DiffModal.createDummyMarker(4)}
                >
                  {this.state.notChangedTitles.map(title => (
                    <TreeNode
                      title={title}
                      key={title}
                      isLeaf
                      disabled={true}
                    />
                  ))}
                </TreeNode>
              ) : (
                <></>
              )}
            </Tree>
          </div>
          <div
            style={{
              display: "inline-block",
              width: "50vw",
              height: "100%",
              margin: "0 auto"
            }}
          >
            {this.props.latestCommittedVersion ? (
              <h4 style={{ marginBottom: "1em" }}>
                Comparing against files from version{" "}
                {this.props.latestCommittedVersion.id_num}:
                {" " + this.props.latestCommittedVersion.title}
              </h4>
            ) : (
              undefined
            )}
            {this.renderDiffByTitle(this.state.diffedItemTitle)}
          </div>
        </div>
      </Modal>
    );
  }
}

// export function DUMMY_DO_NOT_USE_OR_YOU_WILL_BE_FIRED_DiffModal(): JSX.Element {
//   return (
//     <DiffModal
//       latestCommittedVersion={{
//         items: [
//           {
//             altLink: "",
//             last_modified_by: "",
//             format: "AML",
//             mimeType: "",
//             title: "My AML.aml",
//             thumbnail_link: "",
//             content_plain: {
//               raw: "this is fake archieml",
//               data: "",
//               html: ""
//             }
//           },
//           {
//             altLink: "",
//             last_modified_by: "",
//             format: "MD",
//             mimeType: "",
//             title: "My Markdown.md",
//             thumbnail_link: "",
//             content_plain: {
//               raw: "# this is fake markdown",
//               data: "",
//               html: "<h1>this is fake markdown</h1>"
//             }
//           },
//           {
//             altLink: "https://picsum.photos/id/608/400/300",
//             last_modified_by: "",
//             format: "",
//             mimeType: "image/jpeg",
//             title: "My Image.jpg",
//             thumbnail_link: "https://picsum.photos/id/608/400/300",
//             content_plain: {
//               raw: "",
//               data: "",
//               html: ""
//             }
//           },
//           {
//             altLink: "",
//             last_modified_by: "",
//             format: "",
//             mimeType: "unknown",
//             title: "My other GONE.strace",
//             thumbnail_link: "",
//             content_plain: {
//               raw: "",
//               data: "",
//               html: ""
//             }
//           }
//         ]
//       }}
//       cachedPackage={{
//         id: "1",
//         slug: "slug1",
//         metadata: {},
//         package_set: "pset",
//         cached: [
//           {
//             altLink: "https://picsum.photos/id/609/400/300",
//             last_modified_by: "",
//             format: "",
//             mimeType: "image/jpeg",
//             title: "My Image.jpg",
//             thumbnail_link: "https://picsum.photos/id/609/400/300",
//             content_plain: {
//               raw: "",
//               data: "",
//               html: ""
//             }
//           },
//           {
//             altLink: "",
//             last_modified_by: "",
//             format: "AML",
//             mimeType: "",
//             title: "My AML.aml",
//             thumbnail_link: "",
//             content_plain: {
//               raw: "this is fake archieml 222",
//               data: "",
//               html: ""
//             }
//           },
//           {
//             altLink: "",
//             last_modified_by: "",
//             format: "MD",
//             mimeType: "",
//             title: "My Markdown.md",
//             thumbnail_link: "",
//             content_plain: {
//               raw: "# this is fake markdown again!",
//               data: "",
//               html: "<h1>this is fake markdown again!</h1>"
//             }
//           },
//           {
//             altLink: "",
//             last_modified_by: "",
//             format: "MD",
//             mimeType: "",
//             title: "My Markdown NEW.md",
//             thumbnail_link: "",
//             content_plain: {
//               raw: "# this is new markdown!",
//               data: "",
//               html: "<h1>this is new markdown!</h1>"
//             }
//           },
//           {
//             altLink: "https://picsum.photos/id/620/400/300",
//             last_modified_by: "",
//             format: "",
//             mimeType: "image/jpeg",
//             title: "New Image.jpg",
//             thumbnail_link: "https://picsum.photos/id/620/400/300",
//             content_plain: {
//               raw: "",
//               data: "",
//               html: ""
//             }
//           },
//           {
//             altLink: "",
//             last_modified_by: "",
//             format: "",
//             mimeType: "unknown",
//             title: "My other NEW.strace",
//             thumbnail_link: "",
//             content_plain: {
//               raw: "",
//               data: "",
//               html: ""
//             }
//           }
//         ],
//         last_fetched_date: "2019-01-01"
//       }}
//     />
//   );
// }
