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

import { utf8ByteArrayToString } from 'utf8-string-bytes';
import React, { Component } from 'react';
import update from 'react-addons-update';
import debounce from 'lodash.debounce';
import JSZip from 'jszip';

import { readFileAsArrayBuffer } from './util/file-reader';
import { Button, SettingsPanel, FileSelector, StringList } from './components';
import { getInstructionContext } from './util/jct-util';
import { stringContains } from './util/string-util';
import { saveAs } from 'file-saver';
import { translate } from './i18n/i18n';

import StringSearcher from './StringSearcher';
import StringWriter from './StringWriter';
import settings from './settings';

import GearSvg from './icons/gear';
import CoffeIcon from './icons/coffee';

import './App.css';

class App extends Component {
  static INITIAL_CONTEXT = Object.freeze({
    loadedJar: undefined,
    selectedFileName: undefined,
    strings: [],
    filter: undefined,
  });

  state = {
    context: { ...App.INITIAL_CONTEXT },
  };

  constructor(props) {
    super(props);

    const debounced = debounce(
      this.onSearchChange.bind(this),
      settings.debounceRate
    );
    this.onSearchChange = e => {
      e.persist();
      return debounced(e);
    };

    // Update when settings change
    settings.observe(() => this.forceUpdate());
  }

  clearContext = () => {
    if (this.stringSearcher) {
      this.stringSearcher.stop();
    }

    this.setState({ context: { ...App.INITIAL_CONTEXT } });
  };

  onSaveFile = ({ target }) => {
    const { context } = this.state;

    // Disable button while saving
    target.disabled = true;

    StringWriter.write(context.loadedJar, context.strings)
      .then(blob => {
        saveAs(blob, context.selectedFileName || 'Translated.jar');
      })
      .then(() => (target.disabled = false));

    if (window.ga) {
      window.ga('send', 'event', 'file', 'save');
    }
  };

  onJarLoaded = (jar, selectedFileName) => {
    const stringSearcher = (this.stringSearcher = new StringSearcher());
    const foundStrings = [];
    const numClasses = jar.filter(path => path.endsWith('.class')).length;
    let stringId = 0;

    this.setState(state =>
      update(state, {
        loadInfo: { $set: `Procurando 0/${numClasses} classes` },
        context: {
          loadedJar: { $set: jar },
          selectedFileName: { $set: selectedFileName },
        },
      })
    );

    stringSearcher.on(
      'found',
      ({
        fileName,
        classFile,
        constantIndex,
        instructionIndex,
        instructions,
        method,
      }) => {
        const constantEntry = classFile.constant_pool[constantIndex];
        const utf8Constant =
          classFile.constant_pool[constantEntry.string_index];
        const value = utf8ByteArrayToString(utf8Constant.bytes);
        const context = getInstructionContext(
          classFile,
          method,
          instructions[instructionIndex]
        );

        foundStrings.push({
          constantIndex,
          context,
          fileName,
          value,
          id: stringId++,
        });
      }
    );

    stringSearcher.on('read_count', num => {
      this.setState({ loadInfo: `Procurando ${num}/${numClasses} classes` });
    });

    stringSearcher.on('finish', () => {
      // We don't need this anymore
      delete this.stringSearcher;

      this.setState(state =>
        update(state, {
          loadInfo: { $set: undefined },
          context: {
            strings: { $set: foundStrings },
          },
        })
      );
    });

    stringSearcher.searchInJar(jar);
  };

  onFileSelected = file => {
    if (window.ga) {
      window.ga('send', 'event', 'file', 'select', file.size);
    }

    return readFileAsArrayBuffer(file)
      .then(JSZip.loadAsync)
      .then(jar => this.onJarLoaded(jar, file.name));
  };

  onSearchChange = ({ target }) => {
    this.setState(state =>
      update(state, { context: { filter: { $set: target.value } } })
    );
  };

  onStringChanged = (newValue, stringId) => {
    const { context } = this.state;
    const string = context.strings[stringId];

    if (newValue !== string.value) {
      string.value = newValue;
      string.changed = true;
    }
  };

  filterStrings = () => {
    const { context } = this.state;
    const filtered = [];

    const filterStart = performance.now();

    for (const string of context.strings) {
      const { value } = string;

      if (settings.hideEmptyStrings && !value.trim().length) continue;

      // No filter is applied
      if (!context.filter) {
        filtered.push(string);
        continue;
      }

      const words = context.filter.split(' ');
      const foundAllWords = !words.find(w => !stringContains(value, w));

      if (foundAllWords) {
        filtered.push({ ...string, highlightWords: words });
      }
    }

    const filterEnd = performance.now();

    return { filtered, took: filterEnd - filterStart };
  };

  renderAppContainer = children => (
    <div className="app-container">
      <SettingsPanel />

      <div className="brand-container">
        <h2 className="brand" onClick={this.clearContext}>
          Jar String Editor
        </h2>
      </div>

      {children}
    </div>
  );

  render() {
    const { loadInfo, context } = this.state;

    if (context.loadedJar === undefined) {
      return this.renderAppContainer(
        <div>
          <FileSelector onSelected={this.onFileSelected} />
          <Footer />
        </div>
      );
    }

    if (loadInfo) {
      return this.renderAppContainer(
        <div className="load-info-box">
          <GearSvg />
          <p>{loadInfo}</p>
        </div>
      );
    }

    const { filtered, took } = this.filterStrings();

    return this.renderAppContainer(
      <div>
        <div className="header">
          <div className="search">
            <div>{translate('app.search')}</div>
            <input onChange={this.onSearchChange} />
          </div>
          <div className="info">
            <span>
              {translate('app.strings_info', {
                took: took.toFixed(2),
                found: context.strings.length,
                after_filter: filtered.length,
              })}
            </span>
            <Button onClick={this.onSaveFile} className="save-btn">
              {translate('app.save')}
            </Button>
          </div>
        </div>

        <StringList onStringChanged={this.onStringChanged} strings={filtered} />
      </div>
    );
  }
}

const Link = props => (
  <a
    target="_blank"
    rel="noopener noreferrer"
    style={{
      color: 'rgba(0,0,0,.9)',
      textDecoration: 'none',
    }}
    {...props}
  >
    {props.children}
  </a>
);

const Footer = () => (
  <div
    style={{
      textAlign: 'center',
      padding: '1em',
      paddingTop: '1.5em',
      color: 'rgba(0,0,0,.8)',
    }}
  >
    {translate('app.created_by', {
      coffee: <CoffeIcon />,
      link: <Link href="https://github.com/leonardosnt">leonardosnt</Link>,
    })}

    <div style={{ paddingTop: '.6em', fontSize: '.75em' }}>
      <b>
        <Link href="https://jar-string-editor-v1.now.sh/">
          {translate('app.old_version')}
        </Link>
      </b>
    </div>
  </div>
);

window.__BUILD_INFO__ = process.env.__BUILD_INFO__;

export default App;
