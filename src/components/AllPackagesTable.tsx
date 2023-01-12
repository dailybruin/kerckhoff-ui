import React, { useState, useEffect } from 'react';
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
export function AllPackagesTable(props: {
    packageSetInfo: PackageSetInfo, 
    packages: IPackage[], 
    pageChangeHandler: (page?: number, ascending?: boolean) => void
}) {

    // Store current page and sorting order
    const [page, setPage] = useState<number>(1);
    const [sortOrder, setSortOrder] = useState<('ascend' | 'descend')>('ascend' as const);

    // Fetch new packages when either page or sorting order changes
    useEffect(() => {
        if (sortOrder == 'ascend')
            props.pageChangeHandler(page, true);
        else props.pageChangeHandler(page, false);
    }, [page, sortOrder]);

    // Change the sorting order after checking it is valid
    function changeSortOrder(newOrder: string) {
        if (newOrder == "ascend") {
            setSortOrder("ascend" as const);
        } else if (newOrder == "descend") {
            setSortOrder("descend" as const);
        } else return;
    }

    // Set up table's columns for ALL PACKAGES section
    let tableColumns = [
        // Package Name
        {
            title: "Package Name",
            dataIndex: "slug",
            key: "slug",
            render: (pkgName: string) => generateLink(pkgName, props.packageSetInfo.packageSetName)
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
        total: props.packageSetInfo.packageSetSize,
        showTotal: (total: number, range: [number, number]) => {return `${range[0]}-${range[1]} of ${total} items`},    // Text at bottom of page changer
        onChange: setPage,
        showQuickJumper: true,
    } as PaginationConfig

    // Make the slugs the unique key for each of the packages
    for (let pkg of props.packages) {
        (pkg as any)['key'] = pkg.slug;
    }

    return (<>
        <Table pagination={paginationConfig} dataSource={props.packages} columns={tableColumns}>
            <Column />
        </Table>
        <div className={"line-under-scrolly"}>
            <p className={"line-label"}>Sort Order:</p>
            <select onChange={(e) => changeSortOrder(e.target.value)} defaultValue={"ascend"}>
                <option value="ascend">{"Ascending (A - Z)"}</option>
                <option value="descend">{"Descending (Z - A)"}</option>
            </select>
        </div>
    </>);
}

// Generate Link Component
function generateLink(pkgName: string, packageSetName: string): JSX.Element {
    return (
        <Link className={"list-item"} to={`/${packageSetName}/${pkgName}`}>
            {pkgName}
        </Link>
    );  
}
