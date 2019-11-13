/*
 *  Copyright (C) 2017-2018 leonardosnt (leonrdsnt@gmail.com)
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

import React, { Component } from 'react';
import HighlightWords from 'react-highlight-words';

import { prettyMethodInfo } from '../../util/jct-util.js';

import InfoIcon from '../../icons/info';

import './StringEntry.css';
import { translate } from '../../i18n/i18n';

export default class StringEntry extends Component {
  inputRef = React.createRef();

  constructor(props) {
    super(props);

    this.state = {
      focused: false,
      value: props.string.value,
    };
  }

  onDivClick = () => {
    this.setState({ focused: true });
  };

  onChange = ({ target }) => {
    this.setState({ value: target.value });
  };

  componentWillReceiveProps(nextProps) {
    if (this.state.value !== nextProps.string.value) {
      // We don't care if we erase the state.
      this.setState({ value: nextProps.string.value });
    }
  }

  componentDidUpdate() {
    // We use this to focus the input when it changes from the
    // higlighted div. If we don't do this, the user will need to
    // click twice to focus the input.
    if (this.state.focused) {
      this.inputRef.current.focus();
    }
  }

  onInputBlur = () => {
    this.setState({ focused: false });
    this.props.onChanged(this.state.value, this.props.string.id);
  };

  render() {
    const { string } = this.props;

    const useFakeHighlightedInput =
      string.highlightWords && !this.state.focused;

    return (
      <div className="string-entry">
        {useFakeHighlightedInput ? (
          <div onClick={this.onDivClick} className="string-input">
            <HighlightWords
              highlightClassName={'string-highlight'}
              searchWords={string.highlightWords}
              autoEscape={true}
              textToHighlight={this.state.value}
            />
          </div>
        ) : (
          <input
            onChange={this.onChange}
            ref={this.inputRef}
            onBlur={this.onInputBlur}
            type="text"
            className="string-input"
            value={this.state.value}
          />
        )}
        <div className="string-info">
          <InfoIcon />
        </div>
        <StringInfo string={string} />
      </div>
    );
  }
}

const StringInfo = ({ string: { location, context } }) => (
  <div className="string-info-tooltip">
    <span>
      {translate('app.string_info.class', {
        className: <b key="className">{location.className}</b>,
      })}
    </span>
    <span>
      {translate('app.string_info.method', {
        method: <b key="method">{prettyMethodInfo(location.method)}</b>,
      })}
    </span>
    {location.lineNumber && (
      <span>
        {translate('app.string_info.line', {
          lineNumber: <b key="line">{location.lineNumber}</b>,
        })}
      </span>
    )}
    {context && (
      <span>
        {translate('app.string_info.context', {
          context: <b key="context">{context}</b>,
        })}
      </span>
    )}
  </div>
);
