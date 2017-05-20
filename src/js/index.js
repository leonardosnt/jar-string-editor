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

import { JavaClassFileWriter, JavaClassFileReader, ConstantPoolInfo, Opcode, ConstantType, Instruction, InstructionParser, Modifier } from 'java-class-tools';
import { stringToUtf8ByteArray, utf8ByteArrayToString } from './crypt';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import I18n from './I18n';
import translations from './translations';

/**
 * ShouldBeModified:
 *  - yes: Probably will not cause any issue.
 *  - no: Big chance to cause an issue
 *  - maybe: Change only if you know what you are doing.
 */
const contextInfoMap = {
  'SendMessage': {
    priority: 10,
    shouldBeModified: 'yes'
  },
  'HasPermission': {
    shouldBeModified: 'maybe'
  },
  'ItemDisplayName': {
    shouldBeModified: 'maybe'
  }
};

const settings = {
  orderByContext: $('[data-setting-id=showContext]').prop('checked'),
  showContext: $('[data-setting-id=orderByContext]').prop('checked')
};

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

// Selected file name, used when saving...
let fileName = undefined;

// JSZip instance
let jarFile = undefined;

// Unique id for each string
let stringId = 0;

const i18n = new I18n(translations);

/**
 * Called when user select a file.
 *
 * @param {Event} e
 */
function onFileSelected (event) {
  const fileReader = new FileReader();
  const classReader = new JavaClassFileReader();
  const selectedFile = event.target.files[0];

  const stringsFragment = document.createDocumentFragment();
  const readStringPromises = [];

  if (selectedFile === undefined) {
    return;
  }

  // Reset stuff
  stringId = 0;
  stringMap = {};
  fileName = selectedFile.name;
  $('#string-list').empty();

  /**
   * @param {File} file
   */
  function readStrings (file) {
    let classFile;

    try {
      classFile = classReader.read(file.data);
    } catch(ex) {
      console.error(`Failed to read ${file.name}`);
      console.error(ex);
      return;
    }

    /**
     * Save strings (constant pool index) that has been mapped before, this will avoid duplicating strings,
     * since constant pool entries can be referenced multiple times in the same class.
     */
    // const alreadyMappedStrings = {};

    classFile.methods.filter(md => (md.access_flags & Modifier.ABSTRACT) === 0).forEach(method => {
      const codeAttribute = method.attributes.filter(attr => {
        const attributeNameBytes = classFile.constant_pool[attr.attribute_name_index].bytes;
        return attributeNameBytes.length === 4 && String.fromCharCode.apply(null, attributeNameBytes) === "Code";
      })[0];

      if (codeAttribute === undefined || codeAttribute.length == 0) {
        return;
      }

      const instructions = InstructionParser.fromBytecode(codeAttribute.code);

      for (let i = 0; i < instructions.length; i++) {
        const insn = instructions[i];

        // We only want LDC_W & LDC instructions
        if (insn.opcode !== Opcode.LDC && insn.opcode !== Opcode.LDC_W) {
          continue;
        }

        const constantIndex = insn.opcode == Opcode.LDC
          ? insn.operands[0]
          : (insn.operands[0] << 8) | insn.operands[1];

        const constantEntry = classFile.constant_pool[constantIndex];

        // Is this a string constant?
        if (constantEntry.tag !== ConstantType.STRING) {
          return;
        }

        // Check if this string was already mapped.
        // if (alreadyMappedStrings[constantIndex] !== undefined) {
        //   return;
        // }

        const utf8Constant = classFile.constant_pool[constantEntry.string_index];
        const stringValue = utf8ByteArrayToString(utf8Constant.bytes);
        const context = settings.showContext
          ? getStringContext(classFile.constant_pool, instructions, i)
          : undefined;

        // Map useful information about this string
        stringMap[stringId] = {
          ownerClass: file.name,
          constantPoolIndex: constantEntry.string_index
        };

        // alreadyMappedStrings[constantIndex] = true;

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

        if (context !== undefined) {
          const contextLabel = document.createElement('label');
          const contextHelpMessage = i18n.translate(`context_help_${context}`);

          contextLabel.className = 'string-ctx';
          contextLabel.innerText = i18n.translate('context', context);
          contextLabel.setAttribute('for', `input-id-${stringId}`);
          contextLabel.setAttribute('data-ctx', context);

          if (contextHelpMessage !== undefined) {
            const helpTipElement = document.createElement('p');
            const contextInfo = contextInfoMap[context];

            helpTipElement.className = 'help-tip';
            helpTipElement.innerText = contextHelpMessage;

            if (contextInfo !== undefined && contextInfo.shouldBeModified !== undefined) {
              const shouldModifyLabel = document.createElement('span');

              shouldModifyLabel.className = `should-modify ${contextInfo.shouldBeModified}`;
              shouldModifyLabel.innerText = i18n.translate(`context_should_be_modified_${contextInfo.shouldBeModified}`);

              helpTipElement.appendChild(shouldModifyLabel);
            }

            contextLabel.appendChild(helpTipElement);
          }

          entryContainer.appendChild(contextLabel);
        }

        entryContainer.appendChild(inputLabel);
        entryContainer.appendChild(input);

        stringsFragment.appendChild(entryContainer);
        stringId++;
      }
    });
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
        const promise = file.async('arraybuffer')
          .then(data => readStrings({ name: file.name, data: data }));
        readStringPromises.push(promise);
      });

    Promise.all(readStringPromises)
      .then(() => {
        const childNodes = Array.prototype.slice.call(stringsFragment.childNodes, 0);

        // TODO: Order by size?
        if (settings.showContext && settings.orderByContext) {
          childNodes.sort(sortStringByContext);
        }

        $('#string-list').append(childNodes);
      });
  }

  fileReader.onload = onFileLoaded;
  fileReader.readAsArrayBuffer(selectedFile);
}

/**
 * Called when user clicks in 'Save File' button
 *
 * @param {Event} e
 */
function onSaveFileClick (e) {
  if (jarFile === undefined) {
    alert("Não ha nada para salvar.");
    return;
  }

  const writer = new JavaClassFileWriter();
  const reader = new JavaClassFileReader();

  // ZipObject#async's promises
  const promises = [];
  const classFiles = [];

  $('#string-list')
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
    });
}

/**
 * Get context for a string at given index
 *
 * Contexts:
 *  - sendMessage - Means that the string will be sent to a CommandSender using CommandSender#sendMessage and can be safely modified.
 *
 * @param {ConstantPoolInfo[]} constantPool
 * @param {Instruction[]} instructions
 * @param {number} index
 */
function getStringContext (constantPool, instructions, index) {
  const nextInstruction = instructions[index + 1];

  if (nextInstruction.opcode === Opcode.INVOKEINTERFACE) {
    const operands = nextInstruction.operands;
    const index = (operands[0] << 8) | operands[1];
    const methodRef = constantPool[index];
    const classNameRef = constantPool[constantPool[methodRef.class_index].name_index];
    const className = utf8ByteArrayToString(classNameRef.bytes);
    const methodNameAndType = constantPool[methodRef.name_and_type_index];
    const methodName = utf8ByteArrayToString(constantPool[methodNameAndType.name_index].bytes);
    const methodSignature = utf8ByteArrayToString(constantPool[methodNameAndType.descriptor_index].bytes);

    const fullMethodDesc = `${className}#${methodName}${methodSignature}`;

    switch (fullMethodDesc) {
      case 'org/bukkit/command/CommandSender#sendMessage(Ljava/lang/String;)V':
      case 'org/bukkit/entity/Player#sendMessage(Ljava/lang/String;)V':
        return 'SendMessage';

      case 'org/bukkit/command/CommandSender#hasPermission(Ljava/lang/String;)Z':
      case 'org/bukkit/entity/Player#hasPermission(Ljava/lang/String;)Z':
        return 'HasPermission';

      case 'org/bukkit/inventory/meta/ItemMeta#setDisplayName(Ljava/lang/String;)V':
        return 'ItemDisplayName';
    }

    // return fullMethodDesc; USED TO DEBUG
  }
}

/**
 * SendMessage > Any context(2) > No Context(1)
 *
 * @param {string} ctx
 */
function contextPriority(ctx) {
  if (ctx === undefined) return 1;

  if (contextInfoMap[ctx] !== undefined) {
    return contextInfoMap[ctx].priority || 2;
  }

  return 2;
}

/**
 * @param {Element} a
 * @param {Element} b
 */
function sortStringByContext(a, b) {
  const strCtxA = a.querySelector('.string-ctx');
  const strCtxB = b.querySelector('.string-ctx');
  const ctxA = strCtxA ? strCtxA.getAttribute('data-ctx') : undefined;
  const ctxB = strCtxB ? strCtxB.getAttribute('data-ctx') : undefined;

  const p1 = contextPriority(ctxA), p2 = contextPriority(ctxB);

  return p1 === p2 ? 0 : p1 > p2 ? -1 : 1;
}

function onSettingChanged (e) {
  const target = $(this);
  const settingId = target.attr('data-setting-id');
  const settingValue = target.prop('checked');

  settings[settingId] = settingValue;
  localStorage.setItem(`setting_${settingId}`, settingValue);
}

function onLanguageChanged (e) {
  let target = $(this);
  let newLang = target.attr('data-lang-id');

  localStorage.setItem('ui_language', newLang);

  i18n.setLanguage(newLang);
  i18n.updateDOM();
}

$('#save-file').click(onSaveFileClick);
$('#file-input').change(onFileSelected);
$('#select-file').click(e => $('#file-input').click());

$('input[data-setting-id]').change(onSettingChanged);
$('input[data-lang-id]').change(onLanguageChanged);

// Load language from localStorage
let storedUiLanguage = localStorage.getItem('ui_language') || navigator.language || 'en';

i18n.setLanguage(storedUiLanguage);

// We don't need to update if language == en because all default text is in english
if (storedUiLanguage !== 'en') {
  i18n.updateDOM();
}

// Update checked inputs
$(`input[data-lang-id]`).each((idx, element) => {
  let target = $(element);
  let langId = target.attr('data-lang-id');

  if (storedUiLanguage !== langId) {
    target.removeAttr('checked');
  } else {
    target.attr('checked', 'checked');
  }
});

// Load settings from localStorage
Object.keys(settings).forEach(setting => {
  let storedValue = localStorage.getItem(`setting_${setting}`);

  if (storedValue != undefined) {
    storedValue = storedValue === 'true'; // convert to boolean
    settings[setting] = storedValue;
    $(`[data-setting-id=${setting}]`).prop('checked', storedValue);
  }
});

// Setup materialize modal
$('.modal').modal({
  dismissible: true,
  opacity: .5,
  inDuration: 100,
  outDuration: 100,
});
