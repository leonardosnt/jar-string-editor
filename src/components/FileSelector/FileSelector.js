/*
 *  Copyright (C) 2017-2020 leonardosnt (leonrdsnt@gmail.com)
 *
 *  This program is free software; you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation; either version 2 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License along
 *  with this program; if not, write to the Free Software Foundation, Inc.,
 *  51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
*/

import React, { Component } from "react";
import Dropzone from "react-dropzone";
import { translate } from "../../i18n/i18n";
import UploadSvg from "../../icons/upload";

import "./FileSelector.css";

export default class FileSelector extends Component {
  state = {
    status: "SELECT",
  };
  dropzoneRef = React.createRef();

  renderDropzone = ({ acceptedFiles, rejectedFiles }) => {
    let { status } = this.state;

    if (rejectedFiles.length) {
      status = "NOT_A_JAR_FILE";
    } else if (acceptedFiles.length) {
      const [file] = acceptedFiles;

      status = "LOADING_FILE";

      // We only care about the catch because we want to show an
      // error to the user if we can't load the file.
      this.props.onSelected(file).catch(error => {
        this.setState({ status: "FAILED_TO_LOAD", error });
      });

      // Clear accepted files
      acceptedFiles.length = 0;
    }

    return (
      <div>
        <UploadSvg />
        {this.renderStatusMessage(status)}
      </div>
    );
  };

  renderStatusMessage = status => {
    switch (status) {
      case "LOADING_FILE":
        return <p>{translate("file_selector.loading")}</p>;

      case "NOT_A_JAR_FILE":
        return (
          <p className="msg-danger">
            {translate("file_selector.not_a_jar_file")}
          </p>
        );

      case "FAILED_TO_LOAD":
        return (
          <span>
            <p className="msg-danger">
              {translate("file_selector.failed_to_load")}
            </p>
            {this.state.error && (
              <p className="msg-danger">{this.state.error.message}</p>
            )}
          </span>
        );

      case "SELECT":
        return <p>{translate("file_selector.select")}</p>;

      // Should never reach here
      default:
        return <p>{status}</p>;
    }
  };

  onKeyPress = (e) => {
    if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
      // Kinda hack but it works.
      // TODO: Maybe update react-dropzone to use it's new api?
      this.dropzoneRef.current.onClick(e);
    }
  };

  render() {
    const dropzoneProps = {
      // Remove styles from Dropzone
      disabledStyle: {},
      activeStyle: {},
      acceptStyle: {},
      rejectStyle: {},
      style: {},
      disablePreview: true,
      multiple: false,
      accept: ".jar",
      className: "drag-area",
      tabIndex: 1,
      onKeyPress: this.onKeyPress
    };

    return (
      <div className="file-selector">
        <Dropzone ref={this.dropzoneRef} {...dropzoneProps}>{this.renderDropzone}</Dropzone>
      </div>
    );
  }
}
