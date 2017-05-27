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

import mitt from 'mitt';
import {
  JavaClassFileReader,
  Modifier,
  InstructionParser,
  Opcode,
  ConstantType
} from 'java-class-tools';

class StringSearcher {
  constructor() {
    Object.assign(this, mitt());
    this.classReader = new JavaClassFileReader();
  }

  /**
   * @param {JSZip} jar - The jar file
   */
  searchInJar(jar) {
    const filePromises = [];

    jar.filter(path => path.endsWith('.class'))
       .forEach(file => {
         const promise = file.async('arraybuffer').then(classData => this.searchInClass(classData));
         filePromises.push(promise);
       });

    Promise.all(filePromises)
      .then(() => this.emit('finish'));
  }

  /**
   * @param {Buffer|ArrayBuffer|Uint8Array} classData - Class data
   */
  searchInClass(classData) {
    const classFile = this.classReader.read(classData);
    const alreadyMappedStrings = new Set();

    classFile.methods.filter(method => (method.access_flags & Modifier.ABSTRACT) === 0).forEach(method => {
      const codeAttribute = method.attributes.filter(attr => {
        const attributeNameBytes = classFile.constant_pool[attr.attribute_name_index].bytes;
        return attributeNameBytes.length === 4 && String.fromCharCode.apply(null, attributeNameBytes) === "Code";
      })[0];

      if (codeAttribute === undefined || codeAttribute.length == 0) {
        return;
      }

      const instructions = InstructionParser.fromBytecode(codeAttribute.code);

      // Loop trough all instructions of this method
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
          continue;
        }

        // Check if this string was already mapped.
        if (alreadyMappedStrings.has(constantIndex)) {
          continue;
        }

        this.emit('found', {
          classFile,
          method,
          instructions,
          instructionIndex: i,
          constantIndex
        });
        alreadyMappedStrings.add(constantIndex);
      }
    });
  }
}

module.exports = StringSearcher;