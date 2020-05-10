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

import { prettyMethodInfo } from '../../util/util.js';

import InfoIcon from '../../icons/info';

import './StringEntry.css';
import { translate } from '../../i18n/i18n';

export default class StringEntry extends Component {
  state = { focused: false };

  onDivClick = ({ target }) => {
    this.setState({ focused: true });
  };

  onInput = ({ target }) => {
    const { string } = this.props;

    // If highlightWords is not undefined it means that the string object was cloned
    // so we need to update it's value here.
    if (string.highlightWords) {
      string.value = target.value;
    }

    this.props.onChanged(target.value, string.id);
  };

  componentDidUpdate() {
    if (this.state.focused) {
      const { input } = this;

      input.focus();

      // Place the caret at end
      setImmediate(() => {
        input.selectionStart = input.selectionEnd = input.value.length;
      });
    }
  }

  onInputBlur = () => {
    this.setState({ focused: false });
  };

  render() {
    const { string } = this.props;
    const { value, highlightWords } = string;

    let element;

    if (!highlightWords || this.state.focused) {
      element = (
        <input
          onInput={this.onInput}
          ref={input => {
            this.input = input;
          }}
          onBlur={this.onInputBlur}
          type="text"
          className="string-input"
          defaultValue={value}
        />
      );
    } else {
      // TODO: tab select? focus & allow to use enter to open the file selector
      element = (
        <div onClick={this.onDivClick} className="string-input">
          <HighlightWords
            highlightClassName={'string-highlight'}
            searchWords={highlightWords}
            autoEscape={true}
            textToHighlight={value}
          />
        </div>
      );
    }

    return (
      <div className="string-entry">
        {element}
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
