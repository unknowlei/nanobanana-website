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
import { FirebaseApp } from '@firebase/app';
import { AppCheckInternalComponentName } from '@firebase/app-check-interop-types';
import { FirebaseAuthInternalName } from '@firebase/auth-interop-types';
import { Provider } from '@firebase/component';
import { QueryManager } from '../core/QueryManager';
import { CallerSdkType } from '../network';
import { MutationManager } from './Mutation';
/**
 * Connector Config for calling Data Connect backend.
 */
export interface ConnectorConfig {
    location: string;
    connector: string;
    service: string;
}
/**
 * Options to connect to emulator
 */
export interface TransportOptions {
    host: string;
    sslEnabled?: boolean;
    port?: number;
}
/**
 *
 * @param fullHost
 * @returns TransportOptions
 * @internal
 */
export declare function parseOptions(fullHost: string): TransportOptions;
/**
 * DataConnectOptions including project id
 */
export interface DataConnectOptions extends ConnectorConfig {
    projectId: string;
}
/**
 * Class representing Firebase Data Connect
 */
export declare class DataConnect {
    readonly app: FirebaseApp;
    private readonly dataConnectOptions;
    private readonly _authProvider;
    private readonly _appCheckProvider;
    _queryManager: QueryManager;
    _mutationManager: MutationManager;
    isEmulator: boolean;
    _initialized: boolean;
    private _transport;
    private _transportClass;
    private _transportOptions?;
    private _authTokenProvider?;
    _isUsingGeneratedSdk: boolean;
    _callerSdkType: CallerSdkType;
    private _appCheckTokenProvider?;
    constructor(app: FirebaseApp, dataConnectOptions: DataConnectOptions, _authProvider: Provider<FirebaseAuthInternalName>, _appCheckProvider: Provider<AppCheckInternalComponentName>);
    _useGeneratedSdk(): void;
    _setCallerSdkType(callerSdkType: CallerSdkType): void;
    _delete(): Promise<void>;
    getSettings(): ConnectorConfig;
    setInitialized(): void;
    enableEmulator(transportOptions: TransportOptions): void;
}
/**
 * @internal
 * @param transportOptions1
 * @param transportOptions2
 * @returns
 */
export declare function areTransportOptionsEqual(transportOptions1: TransportOptions, transportOptions2: TransportOptions): boolean;
/**
 * Connect to the DataConnect Emulator
 * @param dc Data Connect instance
 * @param host host of emulator server
 * @param port port of emulator server
 * @param sslEnabled use https
 */
export declare function connectDataConnectEmulator(dc: DataConnect, host: string, port?: number, sslEnabled?: boolean): void;
/**
 * Initialize DataConnect instance
 * @param options ConnectorConfig
 */
export declare function getDataConnect(options: ConnectorConfig): DataConnect;
/**
 * Initialize DataConnect instance
 * @param app FirebaseApp to initialize to.
 * @param options ConnectorConfig
 */
export declare function getDataConnect(app: FirebaseApp, options: ConnectorConfig): DataConnect;
/**
 *
 * @param dcOptions
 * @returns {void}
 * @internal
 */
export declare function validateDCOptions(dcOptions: ConnectorConfig): boolean;
/**
 * Delete DataConnect instance
 * @param dataConnect DataConnect instance
 * @returns
 */
export declare function terminate(dataConnect: DataConnect): Promise<void>;
