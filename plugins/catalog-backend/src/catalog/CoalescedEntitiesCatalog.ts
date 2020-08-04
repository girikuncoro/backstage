/*
 * Copyright 2020 Spotify AB
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Entity } from '@backstage/catalog-model';
import { EntityFilters } from '../database';
import { EntitiesCatalog } from './types';

/**
 * A simple coalescing catalog wrapper, that acts as a front for collecting
 * catalog data from multiple sources.
 *
 * One possible usage could be to have this as a front to both a
 * DatabaseEntitiesCatalog that holds Component kinds, and another company-
 * specific catalog that is a thin wrapper on top of LDAP that supplies Group
 * and User entities. That way you'll get a coherent view of two very different
 * entity sources.
 *
 * This is mainly meant as a functional example, and you may want to provide
 * your own more specialized collector if you have this distinct need. This
 * one does not support adding/updating entities through the API for example.
 * A more competent implementation may direct the writes to different catalogs
 * based on entity kind or similar.
 */
export class CoalescedEntitiesCatalog implements EntitiesCatalog {
  private inner: EntitiesCatalog[];

  constructor(inner: EntitiesCatalog[]) {
    this.inner = inner;
  }

  async entities(filters?: EntityFilters): Promise<Entity[]> {
    const ops = this.inner.map(catalog => catalog.entities(filters));
    const collections = await Promise.all(ops);
    return collections.flat();
  }

  entityByUid(uid: string): Promise<Entity | undefined> {
    return new Promise((resolve, reject) => {
      const ops = this.inner.map(catalog =>
        catalog
          .entityByUid(uid)
          .then(entity => {
            if (entity) {
              resolve(entity);
            }
          })
          .catch(error => {
            reject(error);
          }),
      );
      Promise.all(ops).finally(() => {
        resolve(undefined);
      });
    });
  }

  entityByName(
    kind: string,
    namespace: string | undefined,
    name: string,
  ): Promise<Entity | undefined> {
    return new Promise((resolve, reject) => {
      const ops = this.inner.map(catalog =>
        catalog
          .entityByName(kind, namespace, name)
          .then(entity => {
            if (entity) {
              resolve(entity);
            }
          })
          .catch(error => {
            reject(error);
          }),
      );
      Promise.all(ops).finally(() => {
        resolve(undefined);
      });
    });
  }

  addOrUpdateEntity(): Promise<Entity> {
    throw new Error('Method not implemented.');
  }

  removeEntityByUid(): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
