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
import Dropzone from 'react-dropzone';

import SVGInline from 'react-svg-inline';
import uploadIcon from '../../icons/upload.svg';

import './FileSelector.css';

export default class FileSelector extends Component {
  state = {
    message: 'Clique para selecionar ou arraste e solte o arquivo aqui.',
  };

  render() {
    let message = this.state.message;

    const dropzoneProps = {
      // Remove styles from Dropzone
      disabledStyle: {},
      activeStyle: {},
      acceptStyle: {},
      rejectStyle: {},
      style: {},
      disablePreview: true,
      multiple: false,
      accept: '.jar',
      className: 'drag-area',
    };

    return (
      <div className="file-selector">
        <Dropzone {...dropzoneProps}>
          {({ isDragActive, isDragReject, acceptedFiles, rejectedFiles }) => {
            if (rejectedFiles.length) {
              const [file] = rejectedFiles;
              message = (
                <p className="msg-danger">
                  O arquivo selecionado (
                  <b>{file.name}</b>
                  ) não é um arquivo <b>.jar</b>
                  .
                </p>
              );
            }

            if (acceptedFiles.length) {
              const [file] = acceptedFiles;

              message = 'Carregando arquivo';

              // We only care about the catch because we want to show an
              // error to the user if we can't load the file.
              this.props.onSelected(file).catch(e => {
                this.setState({
                  message: (
                    <span>
                      <p className="msg-danger">
                        Não foi possível carregar o arquivo <b>{file.name}</b>.
                      </p>
                      <p className="msg-danger">{e.message}</p>
                    </span>
                  ),
                });
              });

              // Clear accepted files
              acceptedFiles.length = 0;
            }

            return (
              <div>
                <SVGInline width={'100px'} svg={uploadIcon} />
                {typeof message === 'string' ? <p>{message}</p> : message}
              </div>
            );
          }}
        </Dropzone>
      </div>
    );
  }
}
