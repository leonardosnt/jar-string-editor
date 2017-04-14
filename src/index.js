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

  $('#file-input').change(e => {
    const reader = new FileReader();
    const jclassReader = new JavaClassFileReader();
    const file = e.target.files[0];

    if (file === undefined) {
      return;
    }

    // Reset stuff
    stringId = 0;
    stringMap = {};
    fileName = file.name;
    $stringList.empty();

    function readStrings (file) {
      const classFile = jclassReader.read(file.data);
      const elements = [];

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

            const utf8Constant = classFile.constant_pool[constantEntry.string_index];
            const stringValue = utf8ByteArrayToString(utf8Constant.bytes);

            // Map useful information about this string
            stringMap[stringId] = {
              ownerClass: file.name,
              constantPoolIndex: constantEntry.string_index
            };

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

            elements.push(entryContainer);
            stringId++;
          });
      })

      if (elements.length > 0) {
        $stringList.append(elements);
      }
    }

    reader.onload = (e) => {
      const data = e.target.result;

      new JSZip()
        .loadAsync(data)
        .then(zip => {
          // save zip instance
          jarFile = zip;

          zip
            .filter(f => f.endsWith('.class'))
            .forEach(f => {
              f.async('arraybuffer')
                .then(data => readStrings({
                  name: f.name,
                  data: data
                }));
            });
        });
    };

    reader.readAsArrayBuffer(file);
  })
});

let storedUiLanguage = localStorage.getItem('ui_language') || navigator.language;

if (storedUiLanguage) {
  I18n.load(storedUiLanguage);

  $(`input[data-lang-id]`).each((idx, ele) => {
    let target = $(ele);
    let langId = target.attr('data-lang-id');

    if (storedUiLanguage !== langId) {
      target.removeAttr('checked');
    } else {
      target.attr('checked', '');
    }
  });
}

$('input[data-lang-id]').on('change', e => {
  let target = $(e.target);
  let newLang = target.attr('data-lang-id');

  localStorage.setItem('ui_language', newLang);
  I18n.load(newLang);
});