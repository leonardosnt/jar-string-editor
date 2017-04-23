/*
 *  Copyright (C) 2017 leonardosnt
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

import { JavaClassFileWriter, JavaClassFileReader, Opcode, ConstantType, InstructionParser, Modifier } from 'java-class-tools';
import JSZip from 'jszip';
import { stringToUtf8ByteArray, utf8ByteArrayToString } from './crypt';
import { saveAs } from 'file-saver';
import I18n from './I18n';

$(function () {
  const $stringList = $('#string-list');

  /**
   * Save information about each string.
   * 
   * {
   *   id: {
   *     ownerClass: string, // Class that owns this string
   *     constantPoolIndex: number // Index in ownerClass's constant_pool
   *   }
   *   ...
   * }
   */
  let stringMap = {};

  let fileName = undefined;

  // JSZip instance
  let jarFile = undefined;

  // Unique id for each string
  let stringId = 0;

  $('#save-file').click(e => {
    if (jarFile === undefined) {
      alert("Não ha nada para salvar.");
    } else {
      const writer = new JavaClassFileWriter();
      const reader = new JavaClassFileReader();
      
      // ZipObject#async's promises
      const promises = [];
      const classFiles = [];

      $stringList
        .children('.input-field')
        .filter((idx, ele) => $(ele).children('input').val() !== '')
        .each((idx, ele) => {
          const $element = $(ele);

          // Changed string
          const inputValue = $element.find('input').val();
          const strMapIndex = $element.attr('data-id');
          const strMapValue = stringMap[strMapIndex];

          const promise = jarFile.file(strMapValue.ownerClass).async('arraybuffer');
          
          promise.then(data => {
            const classFile = classFiles[strMapValue.ownerClass] || (classFiles[strMapValue.ownerClass] = reader.read(data));

            const utf8Constant = classFile.constant_pool[strMapValue.constantPoolIndex];
            const stringBytes = stringToUtf8ByteArray(inputValue.replace('\\n', '\n'));

            utf8Constant.length = stringBytes.length;
            utf8Constant.bytes = [];

            // Copy bytes from ArrayBuffer to Array
            stringBytes.forEach(b => utf8Constant.bytes.push(b));

            // Write modified ClassFile
            const classFileBuf = writer.write(classFile);
            jarFile.file(strMapValue.ownerClass, classFileBuf.buffer);
          });

          promises.push(promise);
        });

      // Wait all ZipObject#async's promises
      Promise.all(promises)
        .then(() => jarFile.generateAsync({ type: 'blob', compression: 'DEFLATE' }))
        .then(blob => {
          saveAs(blob, fileName || "translated.jar");
        })
    }
  })

  $('#select-file').click(e => {
    $('#file-input').click();
  });

  $('#file-input').change(event => {
    const fileReader = new FileReader();
    const classReader = new JavaClassFileReader();
    const selectedFile = event.target.files[0];

    if (selectedFile === undefined) {
      return;
    }

    // Reset stuff
    stringId = 0;
    stringMap = {};
    fileName = selectedFile.name;
    $stringList.empty();

    /**
     * @param {File} file 
     */
    function readStrings (file) {
      const classFile = classReader.read(file.data);
      const fragment = document.createDocumentFragment();

      /**
       * Save strings (constant pool index) that has been mapped before, this will avoid duplicating strings, 
       * since constant pool entries can be referenced multiple times in the same class.
       */
      const alreadyMappedStrings = {};

      classFile.methods.filter(md => (md.access_flags & Modifier.ABSTRACT) === 0).forEach(method => {
        const codeAttribute = method.attributes.filter(attr => {
          const attributeNameBytes = classFile.constant_pool[attr.attribute_name_index].bytes;
          return attributeNameBytes.length === 4 && String.fromCharCode.apply(null, attributeNameBytes) === "Code";
        })[0];

        if (codeAttribute === undefined || codeAttribute.length == 0) {
          return;
        }

        const instructions = InstructionParser.fromBytecode(codeAttribute.code);

        instructions
          .filter(i => i.opcode == Opcode.LDC || i.opcode == Opcode.LDC_W)
          .forEach(i => {
            const constantIndex = i.opcode == Opcode.LDC
              ? i.operands[0]
              : (i.operands[0] << 8) | i.operands[1];

            const constantEntry = classFile.constant_pool[constantIndex];

            // Is this a string constant?
            if (constantEntry.tag !== ConstantType.STRING) {
              return;
            }

            // Check if this string was already mapped.
            if (alreadyMappedStrings[constantIndex] !== undefined) {
              return;
            }

            const utf8Constant = classFile.constant_pool[constantEntry.string_index];
            const stringValue = utf8ByteArrayToString(utf8Constant.bytes);

            // Map useful information about this string
            stringMap[stringId] = {
              ownerClass: file.name,
              constantPoolIndex: constantEntry.string_index
            };
            
            alreadyMappedStrings[constantIndex] = true;

            // Create the DOM element
            const entryContainer = document.createElement('div');
            const inputLabel = document.createElement('label');
            const input = document.createElement('input');

            entryContainer.setAttribute('data-id', stringId);
            entryContainer.className = 'input-field';
            inputLabel.innerText = stringValue.replace('\n', '\\n');
            inputLabel.setAttribute('for', `input-id-${stringId}`);
            input.type = 'text';
            input.id = `input-id-${stringId}`;

            entryContainer.appendChild(inputLabel);
            entryContainer.appendChild(input);

            fragment.appendChild(entryContainer);
            stringId++;
          });
      })

      if (fragment.childNodes.length > 0) {
        $stringList.append(fragment);
      }
    }

    /**
     * @param {Event} event 
     */
    function onFileLoaded (event) {
      const fileData = event.target.result;
      new JSZip().loadAsync(fileData).then(onZipLoaded);
    }

    /**
     * @param {JSZip} zip 
     */
    function onZipLoaded (zip) {
      // save jszip instance
      jarFile = zip;

      zip.filter(file => file.endsWith('.class'))
        .forEach(file => {
          file.async('arraybuffer')
            .then(data => readStrings({ name: file.name, data: data }));
        });
    }

    fileReader.onload = onFileLoaded;
    fileReader.readAsArrayBuffer(selectedFile);
  })
});

// localStorage isn't working on Edge
let localStorageWorking = true;
try {
  localStorage;
} catch (ex) {
  localStorageWorking = false;
}

let storedUiLanguage = localStorageWorking ? localStorage.getItem('ui_language') : navigator.language || 'en-US';

if (storedUiLanguage) {
  I18n.load(storedUiLanguage);

  $(`input[data-lang-id]`).each((idx, element) => {
    let target = $(element);
    let langId = target.attr('data-lang-id');

    if (storedUiLanguage !== langId) {
      target.removeAttr('checked');
    } else {
      target.attr('checked', '');
    }
  });
}

$('input[data-lang-id]').on('change', event => {
  let target = $(event.target);
  let newLang = target.attr('data-lang-id');

  if (localStorageWorking) {
    localStorage.setItem('ui_language', newLang);
  }
  I18n.load(newLang);
});