/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { OnCompleteSubscription, OnErrorSubscription, OnResultSubscription, QueryPromise, QueryRef } from '../api/query';
import { OperationRef, OpResult } from '../api/Reference';
import { DataConnectTransport } from '../network';
import { DataConnectError } from './error';
/**
 * Representation of user provided subscription options.
 */
interface DataConnectSubscription<Data, Variables> {
    userCallback: OnResultSubscription<Data, Variables>;
    errCallback?: (e?: DataConnectError) => void;
    onCompleteCallback?: () => void;
    unsubscribe: () => void;
}
interface TrackedQuery<Data, Variables> {
    ref: Omit<OperationRef<Data, Variables>, 'dataConnect'>;
    subscriptions: Array<DataConnectSubscription<Data, Variables>>;
    currentCache: OpResult<Data> | null;
    lastError: DataConnectError | null;
}
export declare class QueryManager {
    private transport;
    _queries: Map<string, TrackedQuery<unknown, unknown>>;
    constructor(transport: DataConnectTransport);
    track<Data, Variables>(queryName: string, variables: Variables, initialCache?: OpResult<Data>): TrackedQuery<Data, Variables>;
    addSubscription<Data, Variables>(queryRef: OperationRef<Data, Variables>, onResultCallback: OnResultSubscription<Data, Variables>, onCompleteCallback?: OnCompleteSubscription, onErrorCallback?: OnErrorSubscription, initialCache?: OpResult<Data>): () => void;
    executeQuery<Data, Variables>(queryRef: QueryRef<Data, Variables>): QueryPromise<Data, Variables>;
    enableEmulator(host: string, port: number): void;
}
export {};
