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

import settings from '../../settings';

import settingsOpenIcon from '../../icons/settings-open.svg';
import settingsCloseIcon from '../../icons/settings-close.svg';

import { Button } from '../';

import './SettingsPanel.css';

class CheckboxOption extends Component {
  onChange = ({ target }) => {
    this.props.persistTo[this.props.persistKey] = target.checked;
  };

  render() {
    return (
      <section>
        <label style={{ cursor: 'pointer' }}>
          <input
            onChange={this.onChange}
            defaultChecked={this.props.persistTo[this.props.persistKey]}
            type="checkbox"
          />
          {this.props.children}
        </label>
      </section>
    );
  }
}

export default class SettingsPanel extends Component {
  state = { hidden: true };

  onSave = () => {
    settings.save();
    this.setState({ hidden: true });
  };

  onToggle = () => {
    this.setState(state => ({ hidden: !state.hidden }));
  };

  render() {
    const { hidden } = this.state;

    const settingsToggleIcon = hidden ? settingsOpenIcon : settingsCloseIcon;

    return (
      <div className="settings-container">
        <div onClick={this.onToggle}>
          <SVGInline
            className="toggle-icon"
            svg={settingsToggleIcon}
            alt="settings"
          />
        </div>

        <div className={'sidebar' + (hidden ? ' hidden' : '')}>
          <div className="settings-wrapper">
            <h4>Configurações</h4>

            <CheckboxOption
              persistTo={settings}
              persistKey={'hideEmptyStrings'}
            >
              Não mostrar strings vazias.
            </CheckboxOption>
          </div>

          <div className="actions">
            <Button onClick={this.onSave} className="done-btn">
              Salvar
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
