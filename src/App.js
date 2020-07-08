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
import debounce from "lodash.debounce";
import JSZip from "jszip";

import { Button, SettingsPanel, FileSelector, StringList } from "./components";
import {
  getStringContext,
  extractClassName,
  extractMethodInfoConstants,
  getInstructionLineNumber,
} from "./util/util";
import { escapeRegExp } from "./util/string-util";
import { saveAs } from "file-saver";
import { translate } from "./i18n/i18n";

import StringSearcher from "./StringSearcher";
import StringWriter from "./StringWriter";
import Settings from "./settings";

import GearSvg from "./icons/gear";
import CoffeIcon from "./icons/coffee";

import "./App.css";

class App extends Component {
  static INITIAL_STATE = Object.freeze({
    loadedJar: undefined,
    selectedFileName: undefined,
    strings: [],
    filter: undefined,
  });

  state = { ...App.INITIAL_STATE }

  constructor(props) {
    super(props);

    const setupSearchDebounce = () => {
      if (this.debouncedOnSearchChange) {
        this.debouncedOnSearchChange.cancel();
      }

      this.debouncedOnSearchChange = debounce(
        filter => this.setState({ filter }),
        Number(Settings.debounceRate)
      );
    };

    setupSearchDebounce();

    // Update when settings change
    Settings.observe(oldSettings => {
      if (oldSettings.sortByContext !== Settings.sortByContext) {
        this.setState(state => ({ strings: this._sortByContext(state.strings) }));
      }
      if (oldSettings.debounceRate !== Settings.debounceRate) {
        setupSearchDebounce();
      }

      this.forceUpdate();
    });
  }

  clearContext = () => {
    if (this.currentStringSearcher) {
      this.currentStringSearcher.stop();
    }

    this.selectedFile = undefined;
    this.jdecWindow = undefined;

    this.setState(App.INITIAL_STATE);
  };

  onSaveFile = ({ target }) => {
    const {loadedJar, strings, selectedFileName} = this.state;

    // Disable button while saving
    target.disabled = true;

    StringWriter.write(loadedJar, strings)
      .then(blob => {
        saveAs(blob, selectedFileName || "Translated.jar");
      })
      .then(() => (target.disabled = false));

    gaEvent("file", "save");
  };

  onJarLoaded = (jar, selectedFileName) => {
    const stringSearcher = new StringSearcher();
    const numClasses = jar.filter(path => path.endsWith(".class")).length;

    // Used to stop the current search if needed.
    this.currentStringSearcher = stringSearcher;

    this.setState({
      loadInfo: translate("app.collecting_strings", {
        progress: 0,
        numDone: 0,
        numClasses,
      }),
      loadedJar: jar,
      selectedFileName: selectedFileName,
    });

    stringSearcher.on("read_count", numDone => {
      this.setState({
        loadInfo: translate("app.collecting_strings", {
          progress: (numDone / numClasses * 100).toFixed(1),
          numDone,
          numClasses,
        }),
      });
    });

    stringSearcher.on("finish", this.onStringSearcherFinish);

    stringSearcher.searchInJar(jar);
  };

  onStringSearcherFinish = result => {
    const stringsFound = [];
    let stringId = 0;

    for (const { classFile, fileName, methods } of result) {
      const className = extractClassName(
        classFile.this_class,
        classFile.constant_pool
      );

      for (const { method, strings, instructions } of methods) {
        // Extract method info constants only once
        const methodLocation = extractMethodInfoConstants(
          method,
          classFile.constant_pool
        );

        for (const string of strings) {
          const location = {
            className,
            method: methodLocation,
            lineNumber: getInstructionLineNumber(classFile, method, string.instruction),
          };

          stringsFound.push({
            ...string,
            fileName,
            location,
            id: stringId++,
            context: Settings.sortByContext
              && getStringContext(classFile.constant_pool, instructions, string.instructionIndex),
          });
        }
      }
    }

    // We don't need this anymore
    delete this.currentStringSearcher;

    if (Settings.sortByContext) {
      this._sortByContext(stringsFound);
    }

    this.setState({ loadInfo: undefined, strings: stringsFound });
  };

  onFileSelected = file => {
    gaEvent("file", "select");

    // TODO: not sure if this should be stored on state...
    this.selectedFile = file;

    return JSZip.loadAsync(file).then(jar => this.onJarLoaded(jar, file.name));
  };

  onSearchChange = (e) => {
    if (this.debouncedOnSearchChange) {
      this.debouncedOnSearchChange(e.target.value);
    } else {
      this.setState({ filter: e.target.value });
    }
  };

  onStringChanged = (newValue, stringId) => {
    const string = this.state.strings.find(s => s.id === stringId);

    if (newValue !== string.value) {
      string.value = newValue;
      string.changed = true;
    }
  };

  filterStrings = () => {
    const {strings, filter} = this.state;

    if (!filter) {
      // TODO: maybe we should filter empty strings only when they are loaded or when
      // the settings change...
      return ({
        filtered: strings.filter(f => !Settings.hideEmptyStrings || f.value.trim().length > 0),
        took: 0
      });
    }

    const filtered = [];
    const words = filter.split(" ");
    const filterStart = performance.now();

    // Regex pattern to match all words in any order
    // Based on https://stackoverflow.com/a/4389683 (adapted)
    const wordsPattern = words
      .map(w => escapeRegExp(w))
      .map(w => `(?=.*${w})`)
      .join('');
    const regex = new RegExp(`^${wordsPattern}.*$`, 'i');

    for (const string of strings) {
      if (Settings.hideEmptyStrings && string.value.trim().length === 0) continue;

      if (regex.test(string.value)) {
        filtered.push(Object.assign({ highlightWords: words }, string));
      }
    }

    const filterEnd = performance.now();

    return { filtered, took: filterEnd - filterStart };
  };

  handleViewClass = (string) => {
    const JDEC_URL = process.env.REACT_APP_JDEC_DEV_URL || "https://jdec.app";

    const payload = {
      action: "open",
      jarFile: this.selectedFile,
      path: string.fileName,
      highlight: string.value
    };

    if (this.jdecWindow === undefined || this.jdecWindow.closed) {
      const handleAppReady = e => {
        const originHost = new URL(e.origin).host;
        const jdecHost = new URL(JDEC_URL).host;

        if (originHost !== jdecHost || e.data !== "app-ready") return;

        window.removeEventListener("message", handleAppReady);

        this.jdecWindow.postMessage(payload, JDEC_URL);
      };
      window.addEventListener("message", handleAppReady);

      // TODO: not sure if this should be stored on state...
      this.jdecWindow = window.open(`${JDEC_URL}?jse`, "jdec");
    } else {
      this.jdecWindow.focus();
      this.jdecWindow.postMessage(payload, JDEC_URL);
    }

    gaEvent("misc", "view-class");
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
    const { loadInfo, loadedJar, strings } = this.state;

    if (loadedJar === undefined) {
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
            <div>{translate("app.search")}</div>
            <input onChange={this.onSearchChange} />
          </div>
          <div className="info">
            <span>
              {translate("app.strings_info", {
                took: took.toFixed(2),
                found: strings.length,
                after_filter: filtered.length,
              })}
            </span>
            <Button onClick={this.onSaveFile} className="btn-large save-btn">
              {translate("app.save")}
            </Button>
          </div>
        </div>

        <StringList handleViewClass={this.handleViewClass} onStringChanged={this.onStringChanged} strings={filtered} />
      </div>
    );
  }

  _sortByContext = strings => {
    const contextPriority = {
      SendMessage: 2,
      ItemDisplayName: 1,
      [undefined]: 0,
    };

    strings.sort((str0, str1) => {
      const ctx0 = str0.context;
      const ctx1 = str1.context;
      return ctx0 === ctx1 ? 0 : contextPriority[ctx1] - contextPriority[ctx0];
    });

    return strings;
  };
}

const Link = props => (
  <a
    target="_blank"
    rel="noopener noreferrer"
    style={{
      color: "rgba(0, 45, 99, 0.9)",
      textDecoration: "none",
    }}
    {...props}
  >
    {props.children}
  </a>
);

const Footer = () => (
  <div
    style={{
      textAlign: "center",
      padding: "1em",
      paddingTop: "1.5em",
      color: "rgba(0,0,0,.8)",
    }}
  >
    {translate("app.created_by", {
      coffee: <CoffeIcon key="coffee" />,
      link: (
        <Link key="link" href="https://github.com/leonardosnt">
          leonardosnt
        </Link>
      ),
    })}
  </div>
);

function gaEvent(category, action, label, value) {
  if (typeof window.ga === "function") {
    window.ga("send", "event",  category, action, label, value);
  }
}

window.__BUILD_INFO__ = process.env.__BUILD_INFO__;

Settings.observe(oldSettings => {
  if (oldSettings.language === Settings.language || !window.ga) return;
  gaEvent("language", "change", Settings.language);
});

window.addEventListener("mousedown", e => document.body.classList.add("using-mouse"));
window.addEventListener("keydown", e => e.key === "Tab" && document.body.classList.remove("using-mouse"));

export default App;