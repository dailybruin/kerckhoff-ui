import { notification, Icon } from "antd";
import React from "react";

export const notifyOk = (message: string, duration?: number) =>
  notification.open({
    message,
    duration: duration ? +duration : 5,
    icon: <Icon type="check" style={{ color: "green" }} />
  });

export const notifyError = (message: string, duration?: number) =>
  notification.open({
    message,
    duration: duration ? +duration : 5,
    icon: <Icon type="exclamation" style={{ color: "red" }} />
  });

export const notifyInfo = (message: string, duration?: number) =>
  notification.open({
    message,
    duration: duration ? +duration : 5,
    icon: <Icon type="info-circle" style={{ color: "blue" }} />
  });
