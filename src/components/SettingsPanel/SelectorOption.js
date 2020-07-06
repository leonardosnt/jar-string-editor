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

export default class SelectorOption extends Component {
  onChange = ({ target }) => {
    this.props.persistTo[this.props.persistKey] =
      target.options[target.selectedIndex].value;
  };

  render() {
    const { label, options, defaultValue } = this.props;

    return (
      <section className="option">
        <span className="option-right">{label}</span>
        <select onChange={this.onChange} defaultValue={defaultValue}>
          {options.map(opt => <option key={opt}>{opt}</option>)}
        </select>
      </section>
    );
  }
}
