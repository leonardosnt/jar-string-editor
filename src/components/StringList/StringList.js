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

import StringEntry from "./StringEntry";
import "./StringList.css";
import { translate } from "../../i18n/i18n";

import { Button } from "../";

export default class StringList extends Component {
  static LOAD_MORE_AMOUNT = 50;

  state = { limitToRender: StringList.LOAD_MORE_AMOUNT };

  loadMore = () => {
    const { props, state } = this;

    if (state.limitToRender >= props.strings.length) {
      return;
    }

    this.setState({
      limitToRender: state.limitToRender + StringList.LOAD_MORE_AMOUNT,
    });
  };

  render() {
    const { strings } = this.props;
    const { limitToRender } = this.state;

    const remaining = strings.length - limitToRender;

    return (
      <div className="strings-container">
        <div className="string-list">
          {strings.slice(0, limitToRender).map((string, index) => {
            return (
              <StringEntry
                key={string.id}
                index={index}
                onChanged={this.props.onStringChanged}
                string={string}
                handleViewClass={this.props.handleViewClass}
              />
            );
          })}
        </div>
        {remaining > 0 && (
          <div className="load-more-btn-container">
            <Button onClick={this.loadMore} className="btn-large">
              {translate("app.load_more")} ({remaining})
            </Button>
          </div>
        )}
      </div>
    );
  }
}
