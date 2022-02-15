import React from 'react';
import { Link } from "react-router-dom";

import { Table } from "antd";
import Column from "antd/lib/table/Column";
import { PaginationConfig } from 'antd/lib/pagination';

import { DateTime } from 'luxon';

import { IPackage, IResponseUser } from '../commons/interfaces';

import './AllPackagesTable.css';

export interface PackageSetInfo {
    packageSetName: string,
    packageSetSize: number
}

// Table to display all packages on the homepage
export class AllPackagesTable extends React.Component<
    // Props
    {
        packageSetInfo: PackageSetInfo, 
        packages: IPackage[], 
        pageChangeHandler: (arg0: number) => void
    }
> {
    render() {
        // Set up table's columns for ALL PACKAGES section
        let tableColumns = [
            // Package Name
            {
                title: "Package Name",
                dataIndex: "slug",
                key: "slug",
                render: (pkgName: string) => generateLink(pkgName, this.props.packageSetInfo.packageSetName)
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
                    <>{DateTime.fromISO(lastUpdate).toFormat("yyyy-LL-dd HH:mm")}</>
            }
        ];

        // Configure pagination
        const paginationConfig = {
            total: this.props.packageSetInfo.packageSetSize,
            showTotal: (total: number, range: [number, number]) => {return `${range[0]}-${range[1]} of ${total} items`},    // Text at bottom of page changer
            onChange: this.props.pageChangeHandler
        } as PaginationConfig

        return (
            <Table pagination={paginationConfig} dataSource={this.props.packages} columns={tableColumns}>
                <Column />
            </Table>
        );
    }
}

// Generate Link Component
function generateLink(pkgName: string, packageSetName: string): JSX.Element {
    return (
        <Link className={"list-item"} to={`/${packageSetName}/${pkgName}`}>
            {pkgName}
        </Link>
    );  
}
