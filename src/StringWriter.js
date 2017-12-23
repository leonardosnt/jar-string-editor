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

import { stringToUtf8ByteArray } from 'utf8-string-bytes';
import { JavaClassFileReader, JavaClassFileWriter } from 'java-class-tools';

export default class StringWriter {
  /**
   * (Re)write the strings to the jar file
   *
   * @param {JSZip} jar
   * @param {{ fileName: string, value: string, constantIndex: Number }[]} strings
   * @returns {Promise<Blob>}
   */
  static write(jar, strings) {
    const classWriter = new JavaClassFileWriter();
    const classReader = new JavaClassFileReader();
    const classFileMap = new Map();
    const promises = [];

    for (const { constantIndex, changed, fileName, value } of strings) {
      if (!changed) continue;

      // Read and cache the class file
      const cfPromise = classFileMap[fileName]
        ? Promise.resolve(classFileMap[fileName]) // already exists
        : (classFileMap[fileName] = jar
            .file(fileName)
            .async('arraybuffer')
            .then(buf => classReader.read(buf))); // read and parse from jar

      cfPromise.then(classFile => {
        const stringBytes = stringToUtf8ByteArray(value);
        const utf8Entry =
          classFile.constant_pool[
            classFile.constant_pool[constantIndex].string_index
          ];

        // Save in the constant_pool
        utf8Entry.length = stringBytes.length;
        utf8Entry.bytes = stringBytes;

        // Write it back to the jar file
        jar.file(fileName, classWriter.write(classFile).buffer);
      });

      promises.push(cfPromise);
    }

    // Wait all ZipObject#async's promises.
    return Promise.all(promises).then(() =>
      jar.generateAsync({ type: 'blob', compression: 'DEFLATE' })
    );
  }
}
