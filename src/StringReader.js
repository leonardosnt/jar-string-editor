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

import mitt from 'mitt';
import {
  JavaClassFileReader,
  Modifier,
  InstructionParser,
  Opcode,
  ConstantType,
} from 'java-class-tools';

export default class StringReader {
  constructor() {
    Object.assign(this, mitt());
    this._classReader = new JavaClassFileReader();
    this._stopped = false;
  }

  stop() {
    this._stopped = true;
  }

  /**
   * @param {JSZip} jar - The jar file
   */
  searchInJar(jar) {
    const classes = jar.filter(path => path.endsWith('.class'));

    /**
     * We process it sequentially to use less memory (jszip use a lot of memory) and to
     * be able to 'give feedback to the UI' (like, how many class files was read).
     *
     * It's like 'promise serieS'
     */
    let currentClassIdx = 0;

    const processNext = () => {
      let nextFile = classes[currentClassIdx++];

      if (nextFile === undefined || this._stopped) {
        this.emit('finish');
        return;
      }

      nextFile
        .async('arraybuffer')
        .then(classData => this.searchInClass(nextFile.name, classData))
        .then(() => processNext());

      if (currentClassIdx && currentClassIdx % 100 === 0) {
        this.emit('read_count', currentClassIdx);
      }
    };

    processNext();
  }

  /**
   * @param {string} fileName
   * @param {Buffer|ArrayBuffer|Uint8Array} classData - Class data
   */
  searchInClass(fileName, classData) {
    const classFile = this._classReader.read(classData);
    const alreadyMappedStrings = new Set();

    classFile.methods
      .filter(method => (method.access_flags & Modifier.ABSTRACT) === 0)
      .forEach(method => {
        const codeAttribute = method.attributes.filter(attr => {
          const attributeNameBytes =
            classFile.constant_pool[attr.attribute_name_index].bytes;
          return (
            attributeNameBytes.length === 4 &&
            String.fromCharCode.apply(null, attributeNameBytes) === 'Code'
          );
        })[0];

        if (codeAttribute === undefined || codeAttribute.length === 0) {
          return;
        }

        const instructions = InstructionParser.fromBytecode(codeAttribute.code);

        // Loop trough all instructions of this method
        for (var i = 0; i < instructions.length; i++) {
          const { opcode, operands } = instructions[i];

          // We only want LDC_W & LDC instructions
          if (opcode !== Opcode.LDC && opcode !== Opcode.LDC_W) {
            continue;
          }

          const constantIndex =
            opcode === Opcode.LDC
              ? operands[0]
              : (operands[0] << 8) | operands[1]; // LDC_W

          const constantEntry = classFile.constant_pool[constantIndex];

          // Is this a string constant?
          if (constantEntry.tag !== ConstantType.STRING) {
            continue;
          }

          // Check if this string was already mapped.
          if (alreadyMappedStrings.has(constantIndex)) {
            continue;
          }

          this.emit('found', {
            fileName,
            classFile,
            method,
            instructions,
            instructionIndex: i,
            constantIndex,
          });
          alreadyMappedStrings.add(constantIndex);
        }
      });
  }
}
