/**
 * Copyright 2013-2019  GenieACS Inc.
 *
 * This file is part of GenieACS.
 *
 * GenieACS is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * GenieACS is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with GenieACS.  If not, see <http://www.gnu.org/licenses/>.
 */

import * as fs from "fs";
import * as path from "path";
import { connect, devicesCollection } from "../lib/db";

const outputFilename = path.resolve(`data_model_${process.argv[2]}.json`);
process.chdir(path.resolve(path.dirname(fs.realpathSync(__filename)), ".."));

const dataModel = {};

function recursive(object, p = ""): void {
  for (const key in object) {
    if (key[0] === "_" || !object[key]) continue;

    const isObject = object[key]["_object"];
    const isValue = "_value" in object[key];

    if ((isObject && isValue) || (!isObject && !isValue))
      throw new Error("Unexpected object");

    if (isValue) {
      let value = object[key]["_value"];
      if (typeof value === "boolean") value = +value;

      const values = [object[key]["_writable"] || false, value.toString()];
      if (object[key]["_type"]) values.push(object[key]["_type"]);

      dataModel[`${p}${key}`] = values;
    }

    if (isObject) {
      const values = [object[key]["_writable"] || false];
      dataModel[`${p}${key}.`] = values;
      recursive(object[key], `${p}${key}.`);
    }
  }
}

connect()
  .then(() => {
    devicesCollection.findOne(
      {
        _id: process.argv[2],
      },
      {},
      (err, device) => {
        if (err) throw err;

        if (!device) throw new Error("Device not found");

        recursive(device);

        fs.writeFile(outputFilename, JSON.stringify(dataModel, null, 2), () => {
          if (err) throw err;

          process.stdout.write(`${outputFilename} saved\n`);
          process.exit(0);
        });
      }
    );
  })
  .catch((err) => {
    throw err;
  });
