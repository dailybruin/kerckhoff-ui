import React from 'react';
import { Link } from "react-router-dom";

import { Table } from "antd";
import Column from "antd/lib/table/Column";

import { IPackage, IResponseUser } from '../commons/interfaces';

// Table to display all packages on the homepage
export class AllPackagesTable extends React.Component<{packages: IPackage[], linkDirectory: string}> {
    render() {
        // Set up table's columns for ALL PACKAGES section
        let tableColumns = [
            // Package Name
            {
                title: "Package Name",
                dataIndex: "slug",
                key: "slug",
                render: (pkgName: string) => generateLink(pkgName, this.props.linkDirectory)
            },
            // Creator
            {
                title: "Created By",
                dataIndex: "created_by",
                key: "created_by",
                render: (user: IResponseUser) => // Format created by name as Last, First
                    <>{user.last_name + ", " + user.first_name}</>
            },
            // Last Update
            {
                title: "Last Updated",
                dataIndex: "updated_at",
                key: "updated_at",
                render: (lastUpdate: string) => // Format date to YYYY-MM-DD HH:MM
                    <>{dateFormatter(new Date(lastUpdate))}</>
            }
        ];

        return (
            <Table dataSource={this.props.packages} columns={tableColumns}>
                <Column />
            </Table>
        );
    }
}

// Generate Link Component
function generateLink(pkgName: string, linkDirectory: string): JSX.Element {
    // CSS doesn't like '.' in its ID selectors, so replace them with dashes
    let generatedID = "link-" + pkgName.split('.').join('-'); 

    // Underline the link on hover
    function underlineOnHover(id: string) {
        let link = document.querySelector(`#${id}`) as HTMLElement;
        link.style.textDecoration = "underline";
    }

    // Remove the underline after mouse moves away
    function removeUnderline(id: string) {
        let link = document.querySelector(`#${id}`) as HTMLElement;
        link.style.textDecoration = "none";
    }
    
    return (
        <Link id={generatedID} style={{color: "inherit"}} onMouseOver={() => underlineOnHover(generatedID)} onMouseLeave={() => removeUnderline(generatedID)} to={`/${linkDirectory}/${pkgName}`}>
            {pkgName}
        </Link>
    );
}

// Formats date in ISO format: YYYY-MM-DD HH:MM
function dateFormatter(date: Date): string {
    let dateTimeString = "";

    // Date portion
    let isoStr = date.toISOString();
    dateTimeString += isoStr.substring(0, isoStr.lastIndexOf('T'));   // Returns date as YYYY-MM-DD

    dateTimeString += " ";

    // Time portion
    let timeStr = date.toTimeString();
    dateTimeString += timeStr.substring(0, timeStr.indexOf(" "));     // Returns time as HH:MM

    return dateTimeString;
}