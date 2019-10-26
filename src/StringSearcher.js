/*
 *  Copyright (C) 2017-2018 leonardosnt (leonrdsnt@gmail.com)
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
  getAttribute,
  extractClassName,
  extractMethodInfoConstants,
} from './util/jct-util';
import {
  JavaClassFileReader,
  Modifier,
  InstructionParser,
  Opcode,
  ConstantType,
} from 'java-class-tools';

/**
 * This class will emit the following events:
 *
 * - finish: when the searchInJar method finish reading all class files;
 *
 * - found: when a string is found. The payload from this event will follow this format:
 * @example
 * {
 *  fileName: string,
 *  classFile: ClassFile,
 *  method: MethodInfo,
 *  instructions: Instruction[],
 *  instructionIndex: Number,
 *  constantIndex: Number,
 *  context: string
 * }
 */
export default class StringReader {
  constructor() {
    Object.assign(this, mitt());
    this._classReader = new JavaClassFileReader();
    this._stopped = false;
  }

  /**
   * Stop the searcher
   */
  stop() {
    this._stopped = true;
  }

  /**
   * Search in all classes from the jar file.
   *
   * @param {JSZip} jar - The jar file
   */
  searchInJar(jar) {
    const classes = jar.filter(path => path.endsWith('.class'));

    /**
     * We process the classe sequentially to use less memory (jszip use a lot of memory) and to
     * be able to 'give feedback to the UI' (i.e. display how many class files has been read).
     *
     * It's like 'promise series'
     */
    let currentClassIdx = 0;

    const processNext = () => {
      const currentClassFile = classes[currentClassIdx++];

      // If currentClassFile is undefined it means we are done
      if (currentClassFile === undefined || this._stopped) {
        this.emit('finish');
        return;
      }

      // Unzip the class file and search on it
      currentClassFile
        .async('arraybuffer')
        .then(classData => {
          try {
            this.searchInClass(currentClassFile.name, classData);
          } catch (e) {
            console.error(
              `Failed to search in class '${currentClassFile.name}'`
            );
            console.error(e);
          }
        })
        .then(() => processNext());

      // Every 100 (currently hardcoded) classes we emit an event
      // to update the UI
      if (currentClassIdx && currentClassIdx % 100 === 0) {
        this.emit('read_count', currentClassIdx);
      }
    };

    // Start processing the classes
    processNext();
  }

  /**
   * Search all strings in a class file.
   *
   * @param {string} fileName - The file name (only used to indentify where the string was found
   *  -- we use this to avoid read the class name)
   * @param {Buffer|ArrayBuffer|Uint8Array} classData - Class data
   */
  searchInClass(fileName, classData) {
    const classFile = this._classReader.read(classData);
    const constantPool = classFile.constant_pool;

    /**
     * Here we store the constantIndex of the strings we already found.
     * It's used because the same string can be referenced many times in different methods.
     */
    const alreadyMappedStrings = new Set();

    // Loop through all methods
    classFile.methods
      // Ignore abstract methods since it does not have code
      .filter(method => (method.access_flags & Modifier.ABSTRACT) === 0)
      .forEach(method => {
        // Get the 'Code' attribute from method
        const codeAttribute = getAttribute(classFile, method, 'Code');

        // If the attribute does not exist or it is empty we ignore it.
        if (codeAttribute === undefined || codeAttribute.length === 0) {
          return;
        }

        // Parse the bytecode from the code attribute
        const instructions = InstructionParser.fromBytecode(codeAttribute.code);

        // Loop through all instructions of the method
        for (let i = 0; i < instructions.length; i++) {
          const { opcode, operands } = instructions[i];

          // We only want LDC_W & LDC instructions
          if (opcode !== Opcode.LDC && opcode !== Opcode.LDC_W) {
            continue;
          }

          // The index of the constant in constant_pool. If the opcode is LDC_W,
          // the index will be 2 bytes long.
          const constantIndex =
            opcode === Opcode.LDC
              ? operands[0]
              : (operands[0] << 8) | operands[1]; // LDC_W

          const constantEntry = constantPool[constantIndex];

          // We only want string constants
          if (constantEntry.tag !== ConstantType.STRING) {
            continue;
          }

          // Check if this string was already mapped.
          // If it is, that means we already emitted an event for it
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
            context: this._getStringContext(constantPool, instructions, i),
          });

          // 'Mark' as found
          alreadyMappedStrings.add(constantIndex);
        }
      });
  }

  /**
   * TODO: move to another place?
   * @param {ConstantPoolInfo[]} constantPool
   * @param {Instruction[]} instructions
   * @param {number} index - Index in instructions
   */
  _getStringContext(constantPool, instructions, index) {
    const nextInstruction = instructions[index + 1];

    if (nextInstruction.opcode === Opcode.INVOKEINTERFACE) {
      const operands = nextInstruction.operands;
      const index = (operands[0] << 8) | operands[1];
      const methodRef = constantPool[index];
      const className = extractClassName(methodRef.class_index, constantPool);
      const { name, descriptor } = extractMethodInfoConstants(
        methodRef.name_and_type_index,
        constantPool
      );

      const fullMethodDesc = `${className}#${name}${descriptor}`;

      switch (fullMethodDesc) {
        case 'org/bukkit/command/CommandSender#sendMessage(Ljava/lang/String;)V':
        case 'org/bukkit/entity/Player#sendMessage(Ljava/lang/String;)V':
          return 'SendMessage';

        case 'org/bukkit/inventory/meta/ItemMeta#setDisplayName(Ljava/lang/String;)V':
          return 'ItemDisplayName';

        default:
          return undefined;
      }
    }
  }
}
