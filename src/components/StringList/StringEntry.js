/*
 *  Copyright (C) 2017 leonardosnt (leonrdsnt@gmail)
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
import SVGInline from 'react-svg-inline';
import HighlightWords from 'react-highlight-words';

import { prettyMethodInfo } from '../../util/jct-util.js';

import infoIcon from '../../icons/info.svg';

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
    const { focused } = this.state;
    const { string } = this.props;

    let element;

    if (!string.highlightWords || focused) {
      element = (
        <input
          onInput={this.onInput}
          ref={input => {
            this.input = input;
          }}
          onBlur={this.onInputBlur}
          type="text"
          className="string-input"
          defaultValue={string.value}
        />
      );
    } else {
      // TODO: tab select? focus & allow to use enter to open the file selector
      element = (
        <div onClick={this.onDivClick} className="string-input">
          <HighlightWords
            highlightClassName={'string-highlight'}
            searchWords={string.highlightWords}
            autoEscape={true}
            textToHighlight={string.value}
          />
        </div>
      );
    }

    return (
      <div className="string-entry">
        {element}
        <div className="context">
          <SVGInline className="icon" svg={infoIcon} />
        </div>
        <StringContext context={string.context} />
      </div>
    );
  }
}

const StringContext = ({ context }) => (
  <div className="context-hover">
    <span>
      Classe: <b>{context.className}</b>
    </span>
    <span>
      Método: <b>{prettyMethodInfo(context.method)}</b>
    </span>
    {context.lineNumber && (
      <span>
        Linha: <b>{context.lineNumber}</b>
      </span>
    )}
  </div>
);
