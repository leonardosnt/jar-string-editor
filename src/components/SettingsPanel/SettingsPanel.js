/*
 *  Copyright (C) 2017-2018 leonardosnt (leonrdsnt@gmail)
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

import settings from '../../settings';
import { translate, languages, getCurrentLanguage } from '../../i18n/i18n';

import SettingsOpenIcon from '../../icons/settings-open';
import SettingsCloseIcon from '../../icons/settings-close';
import CheckboxOption from './CheckboxOption';
import SelectorOption from './SelectorOption';
import { Button } from '../';

import './SettingsPanel.css';

const HideEmptyStringsOption = () => (
  <CheckboxOption persistTo={settings} persistKey={'hideEmptyStrings'}>
    {translate('settings.hide_empty_strings')}
  </CheckboxOption>
);

const SortByContextOption = () => (
  <CheckboxOption persistTo={settings} persistKey={'sortByContext'}>
    {translate('settings.sort_by_context.desc')}
    <small style={{ display: 'block', marginLeft: 5, marginTop: 5 }}>
      {translate('settings.sort_by_context.order_desc')}
      <ul style={{ paddingLeft: 30 }}>
        <li>{translate('settings.sort_by_context.order_item.send_message')}</li>
        <li>
          {translate('settings.sort_by_context.order_item.item_display_name')}
        </li>
      </ul>
    </small>
  </CheckboxOption>
);

const LanguageSelectorOption = () => (
  <SelectorOption
    options={Object.keys(languages)}
    label={translate('settings.select_language')}
    defaultValue={getCurrentLanguage()}
    persistTo={settings}
    persistKey={'language'}
  />
);

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

    const settingsToggleIcon = hidden ? (
      <SettingsOpenIcon />
    ) : (
      <SettingsCloseIcon />
    );

    return (
      <div className="settings-container">
        <span onClick={this.onToggle} className="toggle-icon">
          {settingsToggleIcon}
        </span>

        <div className={'sidebar' + (hidden ? ' hidden' : '')}>
          <div className="settings-wrapper">
            <h4>{translate('settings.title')}</h4>

            <h5>{translate('settings.general')}</h5>

            <HideEmptyStringsOption />
            <hr />
            <LanguageSelectorOption />
            <hr />

            <h5>{translate('settings.bukkit_specific')}</h5>
            <SortByContextOption />
          </div>

          <div className="actions">
            <Button onClick={this.onSave} className="done-btn">
              {translate('settings.apply')}
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
