'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var util = require('@firebase/util');
var logger$1 = require('@firebase/logger');
var app = require('@firebase/app');
var component = require('@firebase/component');

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
const Code = {
    OTHER: 'other',
    ALREADY_INITIALIZED: 'already-initialized',
    NOT_INITIALIZED: 'not-initialized',
    NOT_SUPPORTED: 'not-supported',
    INVALID_ARGUMENT: 'invalid-argument',
    PARTIAL_ERROR: 'partial-error',
    UNAUTHORIZED: 'unauthorized'
};
/** An error returned by a DataConnect operation. */
class DataConnectError extends util.FirebaseError {
    constructor(code, message) {
        super(code, message);
        /** @internal */
        this.name = 'DataConnectError';
        // Ensure the instanceof operator works as expected on subclasses of Error.
        // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error#custom_error_types
        // and https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-2.html#support-for-newtarget
        Object.setPrototypeOf(this, DataConnectError.prototype);
    }
    /** @internal */
    toString() {
        return `${this.name}[code=${this.code}]: ${this.message}`;
    }
}
/** An error returned by a DataConnect operation. */
class DataConnectOperationError extends DataConnectError {
    /** @hideconstructor */
    constructor(message, response) {
        super(Code.PARTIAL_ERROR, message);
        /** @internal */
        this.name = 'DataConnectOperationError';
        this.response = response;
    }
}

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
/** The semver (www.semver.org) version of the SDK. */
let SDK_VERSION = '';
/**
 * SDK_VERSION should be set before any database instance is created
 * @internal
 */
function setSDKVersion(version) {
    SDK_VERSION = version;
}

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
const logger = new logger$1.Logger('@firebase/data-connect');
function setLogLevel(logLevel) {
    logger.setLogLevel(logLevel);
}
function logDebug(msg) {
    logger.debug(`DataConnect (${SDK_VERSION}): ${msg}`);
}
function logError(msg) {
    logger.error(`DataConnect (${SDK_VERSION}): ${msg}`);
}

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
const CallerSdkTypeEnum = {
    Base: 'Base', // Core JS SDK
    Generated: 'Generated', // Generated JS SDK
    TanstackReactCore: 'TanstackReactCore', // Tanstack non-generated React SDK
    GeneratedReact: 'GeneratedReact', // Tanstack non-generated Angular SDK
    TanstackAngularCore: 'TanstackAngularCore', // Tanstack non-generated Angular SDK
    GeneratedAngular: 'GeneratedAngular' // Generated Angular SDK
};

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
let connectFetch = globalThis.fetch;
function initializeFetch(fetchImpl) {
    connectFetch = fetchImpl;
}
function getGoogApiClientValue(_isUsingGen, _callerSdkType) {
    let str = 'gl-js/ fire/' + SDK_VERSION;
    if (_callerSdkType !== CallerSdkTypeEnum.Base &&
        _callerSdkType !== CallerSdkTypeEnum.Generated) {
        str += ' js/' + _callerSdkType.toLowerCase();
    }
    else if (_isUsingGen || _callerSdkType === CallerSdkTypeEnum.Generated) {
        str += ' js/gen';
    }
    return str;
}
function dcFetch(url, body, { signal }, appId, accessToken, appCheckToken, _isUsingGen, _callerSdkType, _isUsingEmulator) {
    if (!connectFetch) {
        throw new DataConnectError(Code.OTHER, 'No Fetch Implementation detected!');
    }
    const headers = {
        'Content-Type': 'application/json',
        'X-Goog-Api-Client': getGoogApiClientValue(_isUsingGen, _callerSdkType)
    };
    if (accessToken) {
        headers['X-Firebase-Auth-Token'] = accessToken;
    }
    if (appId) {
        headers['x-firebase-gmpid'] = appId;
    }
    if (appCheckToken) {
        headers['X-Firebase-AppCheck'] = appCheckToken;
    }
    const bodyStr = JSON.stringify(body);
    const fetchOptions = {
        body: bodyStr,
        method: 'POST',
        headers,
        signal
    };
    if (util.isCloudWorkstation(url) && _isUsingEmulator) {
        fetchOptions.credentials = 'include';
    }
    return connectFetch(url, fetchOptions)
        .catch(err => {
        throw new DataConnectError(Code.OTHER, 'Failed to fetch: ' + JSON.stringify(err));
    })
        .then(async (response) => {
        let jsonResponse = null;
        try {
            jsonResponse = await response.json();
        }
        catch (e) {
            throw new DataConnectError(Code.OTHER, JSON.stringify(e));
        }
        const message = getMessage(jsonResponse);
        if (response.status >= 400) {
            logError('Error while performing request: ' + JSON.stringify(jsonResponse));
            if (response.status === 401) {
                throw new DataConnectError(Code.UNAUTHORIZED, message);
            }
            throw new DataConnectError(Code.OTHER, message);
        }
        return jsonResponse;
    })
        .then(res => {
        if (res.errors && res.errors.length) {
            const stringified = JSON.stringify(res.errors);
            const response = {
                errors: res.errors,
                data: res.data
            };
            throw new DataConnectOperationError('DataConnect error while performing request: ' + stringified, response);
        }
        return res;
    });
}
function getMessage(obj) {
    if ('message' in obj && obj.message) {
        return obj.message;
    }
    return JSON.stringify(obj);
}

const name = "@firebase/data-connect";
const version = "0.3.12";

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
/**
 * @internal
 * Abstraction around AppCheck's token fetching capabilities.
 */
class AppCheckTokenProvider {
    constructor(app$1, appCheckProvider) {
        this.appCheckProvider = appCheckProvider;
        if (app._isFirebaseServerApp(app$1) && app$1.settings.appCheckToken) {
            this.serverAppAppCheckToken = app$1.settings.appCheckToken;
        }
        this.appCheck = appCheckProvider?.getImmediate({ optional: true });
        if (!this.appCheck) {
            void appCheckProvider
                ?.get()
                .then(appCheck => (this.appCheck = appCheck))
                .catch();
        }
    }
    getToken() {
        if (this.serverAppAppCheckToken) {
            return Promise.resolve({ token: this.serverAppAppCheckToken });
        }
        if (!this.appCheck) {
            return new Promise((resolve, reject) => {
                // Support delayed initialization of FirebaseAppCheck. This allows our
                // customers to initialize the RTDB SDK before initializing Firebase
                // AppCheck and ensures that all requests are authenticated if a token
                // becomes available before the timoeout below expires.
                setTimeout(() => {
                    if (this.appCheck) {
                        this.getToken().then(resolve, reject);
                    }
                    else {
                        resolve(null);
                    }
                }, 0);
            });
        }
        return this.appCheck.getToken();
    }
    addTokenChangeListener(listener) {
        void this.appCheckProvider
            ?.get()
            .then(appCheck => appCheck.addTokenListener(listener));
    }
}

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
// @internal
class FirebaseAuthProvider {
    constructor(_appName, _options, _authProvider) {
        this._appName = _appName;
        this._options = _options;
        this._authProvider = _authProvider;
        this._auth = _authProvider.getImmediate({ optional: true });
        if (!this._auth) {
            _authProvider.onInit(auth => (this._auth = auth));
        }
    }
    getToken(forceRefresh) {
        if (!this._auth) {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    if (this._auth) {
                        this.getToken(forceRefresh).then(resolve, reject);
                    }
                    else {
                        resolve(null);
                    }
                }, 0);
            });
        }
        return this._auth.getToken(forceRefresh).catch(error => {
            if (error && error.code === 'auth/token-not-initialized') {
                logDebug('Got auth/token-not-initialized error.  Treating as null token.');
                return null;
            }
            else {
                logError('Error received when attempting to retrieve token: ' +
                    JSON.stringify(error));
                return Promise.reject(error);
            }
        });
    }
    addTokenChangeListener(listener) {
        this._auth?.addAuthTokenListener(listener);
    }
    removeTokenChangeListener(listener) {
        this._authProvider
            .get()
            .then(auth => auth.removeAuthTokenListener(listener))
            .catch(err => logError(err));
    }
}

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
const QUERY_STR = 'query';
const MUTATION_STR = 'mutation';
const SOURCE_SERVER = 'SERVER';
const SOURCE_CACHE = 'CACHE';

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
let encoderImpl;
function setEncoder(encoder) {
    encoderImpl = encoder;
}
setEncoder(o => JSON.stringify(o));

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
function setIfNotExists(map, key, val) {
    if (!map.has(key)) {
        map.set(key, val);
    }
}

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
function getRefSerializer(queryRef, data, source) {
    return function toJSON() {
        return {
            data,
            refInfo: {
                name: queryRef.name,
                variables: queryRef.variables,
                connectorConfig: {
                    projectId: queryRef.dataConnect.app.options.projectId,
                    ...queryRef.dataConnect.getSettings()
                }
            },
            fetchTime: Date.now().toLocaleString(),
            source
        };
    };
}
class QueryManager {
    constructor(transport) {
        this.transport = transport;
        this._queries = new Map();
    }
    track(queryName, variables, initialCache) {
        const ref = {
            name: queryName,
            variables,
            refType: QUERY_STR
        };
        const key = encoderImpl(ref);
        const newTrackedQuery = {
            ref,
            subscriptions: [],
            currentCache: initialCache || null,
            lastError: null
        };
        // @ts-ignore
        setIfNotExists(this._queries, key, newTrackedQuery);
        return this._queries.get(key);
    }
    addSubscription(queryRef, onResultCallback, onCompleteCallback, onErrorCallback, initialCache) {
        const key = encoderImpl({
            name: queryRef.name,
            variables: queryRef.variables,
            refType: QUERY_STR
        });
        const trackedQuery = this._queries.get(key);
        const subscription = {
            userCallback: onResultCallback,
            onCompleteCallback,
            errCallback: onErrorCallback
        };
        const unsubscribe = () => {
            const trackedQuery = this._queries.get(key);
            trackedQuery.subscriptions = trackedQuery.subscriptions.filter(sub => sub !== subscription);
            onCompleteCallback?.();
        };
        if (initialCache && trackedQuery.currentCache !== initialCache) {
            logDebug('Initial cache found. Comparing dates.');
            if (!trackedQuery.currentCache ||
                (trackedQuery.currentCache &&
                    compareDates(trackedQuery.currentCache.fetchTime, initialCache.fetchTime))) {
                trackedQuery.currentCache = initialCache;
            }
        }
        if (trackedQuery.currentCache !== null) {
            const cachedData = trackedQuery.currentCache.data;
            onResultCallback({
                data: cachedData,
                source: SOURCE_CACHE,
                ref: queryRef,
                toJSON: getRefSerializer(queryRef, trackedQuery.currentCache.data, SOURCE_CACHE),
                fetchTime: trackedQuery.currentCache.fetchTime
            });
            if (trackedQuery.lastError !== null && onErrorCallback) {
                onErrorCallback(undefined);
            }
        }
        trackedQuery.subscriptions.push({
            userCallback: onResultCallback,
            errCallback: onErrorCallback,
            unsubscribe
        });
        if (!trackedQuery.currentCache) {
            logDebug(`No cache available for query ${queryRef.name} with variables ${JSON.stringify(queryRef.variables)}. Calling executeQuery.`);
            const promise = this.executeQuery(queryRef);
            // We want to ignore the error and let subscriptions handle it
            promise.then(undefined, err => { });
        }
        return unsubscribe;
    }
    executeQuery(queryRef) {
        if (queryRef.refType !== QUERY_STR) {
            throw new DataConnectError(Code.INVALID_ARGUMENT, `ExecuteQuery can only execute query operation`);
        }
        const key = encoderImpl({
            name: queryRef.name,
            variables: queryRef.variables,
            refType: QUERY_STR
        });
        const trackedQuery = this._queries.get(key);
        const result = this.transport.invokeQuery(queryRef.name, queryRef.variables);
        const newR = result.then(res => {
            const fetchTime = new Date().toString();
            const result = {
                ...res,
                source: SOURCE_SERVER,
                ref: queryRef,
                toJSON: getRefSerializer(queryRef, res.data, SOURCE_SERVER),
                fetchTime
            };
            trackedQuery.subscriptions.forEach(subscription => {
                subscription.userCallback(result);
            });
            trackedQuery.currentCache = {
                data: res.data,
                source: SOURCE_CACHE,
                fetchTime
            };
            return result;
        }, err => {
            trackedQuery.lastError = err;
            trackedQuery.subscriptions.forEach(subscription => {
                if (subscription.errCallback) {
                    subscription.errCallback(err);
                }
            });
            throw err;
        });
        return newR;
    }
    enableEmulator(host, port) {
        this.transport.useEmulator(host, port);
    }
}
function compareDates(str1, str2) {
    const date1 = new Date(str1);
    const date2 = new Date(str2);
    return date1.getTime() < date2.getTime();
}

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
function urlBuilder(projectConfig, transportOptions) {
    const { connector, location, projectId: project, service } = projectConfig;
    const { host, sslEnabled, port } = transportOptions;
    const protocol = sslEnabled ? 'https' : 'http';
    const realHost = host || `firebasedataconnect.googleapis.com`;
    let baseUrl = `${protocol}://${realHost}`;
    if (typeof port === 'number') {
        baseUrl += `:${port}`;
    }
    else if (typeof port !== 'undefined') {
        logError('Port type is of an invalid type');
        throw new DataConnectError(Code.INVALID_ARGUMENT, 'Incorrect type for port passed in!');
    }
    return `${baseUrl}/v1/projects/${project}/locations/${location}/services/${service}/connectors/${connector}`;
}
function addToken(url, apiKey) {
    if (!apiKey) {
        return url;
    }
    const newUrl = new URL(url);
    newUrl.searchParams.append('key', apiKey);
    return newUrl.toString();
}

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
class RESTTransport {
    constructor(options, apiKey, appId, authProvider, appCheckProvider, transportOptions, _isUsingGen = false, _callerSdkType = CallerSdkTypeEnum.Base) {
        this.apiKey = apiKey;
        this.appId = appId;
        this.authProvider = authProvider;
        this.appCheckProvider = appCheckProvider;
        this._isUsingGen = _isUsingGen;
        this._callerSdkType = _callerSdkType;
        this._host = '';
        this._location = 'l';
        this._connectorName = '';
        this._secure = true;
        this._project = 'p';
        this._accessToken = null;
        this._appCheckToken = null;
        this._lastToken = null;
        this._isUsingEmulator = false;
        // TODO(mtewani): Update U to include shape of body defined in line 13.
        this.invokeQuery = (queryName, body) => {
            const abortController = new AbortController();
            // TODO(mtewani): Update to proper value
            const withAuth = this.withRetry(() => dcFetch(addToken(`${this.endpointUrl}:executeQuery`, this.apiKey), {
                name: `projects/${this._project}/locations/${this._location}/services/${this._serviceName}/connectors/${this._connectorName}`,
                operationName: queryName,
                variables: body
            }, abortController, this.appId, this._accessToken, this._appCheckToken, this._isUsingGen, this._callerSdkType, this._isUsingEmulator));
            return withAuth;
        };
        this.invokeMutation = (mutationName, body) => {
            const abortController = new AbortController();
            const taskResult = this.withRetry(() => {
                return dcFetch(addToken(`${this.endpointUrl}:executeMutation`, this.apiKey), {
                    name: `projects/${this._project}/locations/${this._location}/services/${this._serviceName}/connectors/${this._connectorName}`,
                    operationName: mutationName,
                    variables: body
                }, abortController, this.appId, this._accessToken, this._appCheckToken, this._isUsingGen, this._callerSdkType, this._isUsingEmulator);
            });
            return taskResult;
        };
        if (transportOptions) {
            if (typeof transportOptions.port === 'number') {
                this._port = transportOptions.port;
            }
            if (typeof transportOptions.sslEnabled !== 'undefined') {
                this._secure = transportOptions.sslEnabled;
            }
            this._host = transportOptions.host;
        }
        const { location, projectId: project, connector, service } = options;
        if (location) {
            this._location = location;
        }
        if (project) {
            this._project = project;
        }
        this._serviceName = service;
        if (!connector) {
            throw new DataConnectError(Code.INVALID_ARGUMENT, 'Connector Name required!');
        }
        this._connectorName = connector;
        this.authProvider?.addTokenChangeListener(token => {
            logDebug(`New Token Available: ${token}`);
            this._accessToken = token;
        });
        this.appCheckProvider?.addTokenChangeListener(result => {
            const { token } = result;
            logDebug(`New App Check Token Available: ${token}`);
            this._appCheckToken = token;
        });
    }
    get endpointUrl() {
        return urlBuilder({
            connector: this._connectorName,
            location: this._location,
            projectId: this._project,
            service: this._serviceName
        }, { host: this._host, sslEnabled: this._secure, port: this._port });
    }
    useEmulator(host, port, isSecure) {
        this._host = host;
        this._isUsingEmulator = true;
        if (typeof port === 'number') {
            this._port = port;
        }
        if (typeof isSecure !== 'undefined') {
            this._secure = isSecure;
        }
    }
    onTokenChanged(newToken) {
        this._accessToken = newToken;
    }
    async getWithAuth(forceToken = false) {
        let starterPromise = new Promise(resolve => resolve(this._accessToken));
        if (this.appCheckProvider) {
            this._appCheckToken = (await this.appCheckProvider.getToken())?.token;
        }
        if (this.authProvider) {
            starterPromise = this.authProvider
                .getToken(/*forceToken=*/ forceToken)
                .then(data => {
                if (!data) {
                    return null;
                }
                this._accessToken = data.accessToken;
                return this._accessToken;
            });
        }
        else {
            starterPromise = new Promise(resolve => resolve(''));
        }
        return starterPromise;
    }
    _setLastToken(lastToken) {
        this._lastToken = lastToken;
    }
    withRetry(promiseFactory, retry = false) {
        let isNewToken = false;
        return this.getWithAuth(retry)
            .then(res => {
            isNewToken = this._lastToken !== res;
            this._lastToken = res;
            return res;
        })
            .then(promiseFactory)
            .catch(err => {
            // Only retry if the result is unauthorized and the last token isn't the same as the new one.
            if ('code' in err &&
                err.code === Code.UNAUTHORIZED &&
                !retry &&
                isNewToken) {
                logDebug('Retrying due to unauthorized');
                return this.withRetry(promiseFactory, true);
            }
            throw err;
        });
    }
    _setCallerSdkType(callerSdkType) {
        this._callerSdkType = callerSdkType;
    }
}

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
/**
 *
 * @param dcInstance Data Connect instance
 * @param mutationName name of mutation
 * @param variables variables to send with mutation
 * @returns `MutationRef`
 */
function mutationRef(dcInstance, mutationName, variables) {
    dcInstance.setInitialized();
    const ref = {
        dataConnect: dcInstance,
        name: mutationName,
        refType: MUTATION_STR,
        variables: variables
    };
    return ref;
}
/**
 * @internal
 */
class MutationManager {
    constructor(_transport) {
        this._transport = _transport;
        this._inflight = [];
    }
    executeMutation(mutationRef) {
        const result = this._transport.invokeMutation(mutationRef.name, mutationRef.variables);
        const withRefPromise = result.then(res => {
            const obj = {
                ...res, // Double check that the result is result.data, not just result
                source: SOURCE_SERVER,
                ref: mutationRef,
                fetchTime: Date.now().toLocaleString()
            };
            return obj;
        });
        this._inflight.push(result);
        const removePromise = () => (this._inflight = this._inflight.filter(promise => promise !== result));
        result.then(removePromise, removePromise);
        return withRefPromise;
    }
}
/**
 * Execute Mutation
 * @param mutationRef mutation to execute
 * @returns `MutationRef`
 */
function executeMutation(mutationRef) {
    return mutationRef.dataConnect._mutationManager.executeMutation(mutationRef);
}

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
const FIREBASE_DATA_CONNECT_EMULATOR_HOST_VAR = 'FIREBASE_DATA_CONNECT_EMULATOR_HOST';
/**
 *
 * @param fullHost
 * @returns TransportOptions
 * @internal
 */
function parseOptions(fullHost) {
    const [protocol, hostName] = fullHost.split('://');
    const isSecure = protocol === 'https';
    const [host, portAsString] = hostName.split(':');
    const port = Number(portAsString);
    return { host, port, sslEnabled: isSecure };
}
/**
 * Class representing Firebase Data Connect
 */
class DataConnect {
    // @internal
    constructor(app, 
    // TODO(mtewani): Replace with _dataConnectOptions in the future
    dataConnectOptions, _authProvider, _appCheckProvider) {
        this.app = app;
        this.dataConnectOptions = dataConnectOptions;
        this._authProvider = _authProvider;
        this._appCheckProvider = _appCheckProvider;
        this.isEmulator = false;
        this._initialized = false;
        this._isUsingGeneratedSdk = false;
        this._callerSdkType = CallerSdkTypeEnum.Base;
        if (typeof process !== 'undefined' && process.env) {
            const host = process.env[FIREBASE_DATA_CONNECT_EMULATOR_HOST_VAR];
            if (host) {
                logDebug('Found custom host. Using emulator');
                this.isEmulator = true;
                this._transportOptions = parseOptions(host);
            }
        }
    }
    // @internal
    _useGeneratedSdk() {
        if (!this._isUsingGeneratedSdk) {
            this._isUsingGeneratedSdk = true;
        }
    }
    _setCallerSdkType(callerSdkType) {
        this._callerSdkType = callerSdkType;
        if (this._initialized) {
            this._transport._setCallerSdkType(callerSdkType);
        }
    }
    _delete() {
        app._removeServiceInstance(this.app, 'data-connect', JSON.stringify(this.getSettings()));
        return Promise.resolve();
    }
    // @internal
    getSettings() {
        const copy = JSON.parse(JSON.stringify(this.dataConnectOptions));
        delete copy.projectId;
        return copy;
    }
    // @internal
    setInitialized() {
        if (this._initialized) {
            return;
        }
        if (this._transportClass === undefined) {
            logDebug('transportClass not provided. Defaulting to RESTTransport.');
            this._transportClass = RESTTransport;
        }
        if (this._authProvider) {
            this._authTokenProvider = new FirebaseAuthProvider(this.app.name, this.app.options, this._authProvider);
        }
        if (this._appCheckProvider) {
            this._appCheckTokenProvider = new AppCheckTokenProvider(this.app, this._appCheckProvider);
        }
        this._initialized = true;
        this._transport = new this._transportClass(this.dataConnectOptions, this.app.options.apiKey, this.app.options.appId, this._authTokenProvider, this._appCheckTokenProvider, undefined, this._isUsingGeneratedSdk, this._callerSdkType);
        if (this._transportOptions) {
            this._transport.useEmulator(this._transportOptions.host, this._transportOptions.port, this._transportOptions.sslEnabled);
        }
        this._queryManager = new QueryManager(this._transport);
        this._mutationManager = new MutationManager(this._transport);
    }
    // @internal
    enableEmulator(transportOptions) {
        if (this._transportOptions &&
            this._initialized &&
            !areTransportOptionsEqual(this._transportOptions, transportOptions)) {
            logError('enableEmulator called after initialization');
            throw new DataConnectError(Code.ALREADY_INITIALIZED, 'DataConnect instance already initialized!');
        }
        this._transportOptions = transportOptions;
        this.isEmulator = true;
    }
}
/**
 * @internal
 * @param transportOptions1
 * @param transportOptions2
 * @returns
 */
function areTransportOptionsEqual(transportOptions1, transportOptions2) {
    return (transportOptions1.host === transportOptions2.host &&
        transportOptions1.port === transportOptions2.port &&
        transportOptions1.sslEnabled === transportOptions2.sslEnabled);
}
/**
 * Connect to the DataConnect Emulator
 * @param dc Data Connect instance
 * @param host host of emulator server
 * @param port port of emulator server
 * @param sslEnabled use https
 */
function connectDataConnectEmulator(dc, host, port, sslEnabled = false) {
    // Workaround to get cookies in Firebase Studio
    if (util.isCloudWorkstation(host)) {
        void util.pingServer(`https://${host}${port ? `:${port}` : ''}`);
        util.updateEmulatorBanner('Data Connect', true);
    }
    dc.enableEmulator({ host, port, sslEnabled });
}
function getDataConnect(appOrOptions, optionalOptions) {
    let app$1;
    let dcOptions;
    if ('location' in appOrOptions) {
        dcOptions = appOrOptions;
        app$1 = app.getApp();
    }
    else {
        dcOptions = optionalOptions;
        app$1 = appOrOptions;
    }
    if (!app$1 || Object.keys(app$1).length === 0) {
        app$1 = app.getApp();
    }
    const provider = app._getProvider(app$1, 'data-connect');
    const identifier = JSON.stringify(dcOptions);
    if (provider.isInitialized(identifier)) {
        const dcInstance = provider.getImmediate({ identifier });
        const options = provider.getOptions(identifier);
        const optionsValid = Object.keys(options).length > 0;
        if (optionsValid) {
            logDebug('Re-using cached instance');
            return dcInstance;
        }
    }
    validateDCOptions(dcOptions);
    logDebug('Creating new DataConnect instance');
    // Initialize with options.
    return provider.initialize({
        instanceIdentifier: identifier,
        options: dcOptions
    });
}
/**
 *
 * @param dcOptions
 * @returns {void}
 * @internal
 */
function validateDCOptions(dcOptions) {
    const fields = ['connector', 'location', 'service'];
    if (!dcOptions) {
        throw new DataConnectError(Code.INVALID_ARGUMENT, 'DC Option Required');
    }
    fields.forEach(field => {
        if (dcOptions[field] === null ||
            dcOptions[field] === undefined) {
            throw new DataConnectError(Code.INVALID_ARGUMENT, `${field} Required`);
        }
    });
    return true;
}
/**
 * Delete DataConnect instance
 * @param dataConnect DataConnect instance
 * @returns
 */
function terminate(dataConnect) {
    return dataConnect._delete();
    // TODO(mtewani): Stop pending tasks
}

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
function registerDataConnect(variant) {
    setSDKVersion(app.SDK_VERSION);
    app._registerComponent(new component.Component('data-connect', (container, { instanceIdentifier: settings, options }) => {
        const app = container.getProvider('app').getImmediate();
        const authProvider = container.getProvider('auth-internal');
        const appCheckProvider = container.getProvider('app-check-internal');
        let newOpts = options;
        if (settings) {
            newOpts = JSON.parse(settings);
        }
        if (!app.options.projectId) {
            throw new DataConnectError(Code.INVALID_ARGUMENT, 'Project ID must be provided. Did you pass in a proper projectId to initializeApp?');
        }
        return new DataConnect(app, { ...newOpts, projectId: app.options.projectId }, authProvider, appCheckProvider);
    }, "PUBLIC" /* ComponentType.PUBLIC */).setMultipleInstances(true));
    app.registerVersion(name, version, variant);
    // BUILD_TARGET will be replaced by values like esm, cjs, etc during the compilation
    app.registerVersion(name, version, 'cjs2020');
}

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
/**
 * Execute Query
 * @param queryRef query to execute.
 * @returns `QueryPromise`
 */
function executeQuery(queryRef) {
    return queryRef.dataConnect._queryManager.executeQuery(queryRef);
}
/**
 * Execute Query
 * @param dcInstance Data Connect instance to use.
 * @param queryName Query to execute
 * @param variables Variables to execute with
 * @param initialCache initial cache to use for client hydration
 * @returns `QueryRef`
 */
function queryRef(dcInstance, queryName, variables, initialCache) {
    dcInstance.setInitialized();
    dcInstance._queryManager.track(queryName, variables, initialCache);
    return {
        dataConnect: dcInstance,
        refType: QUERY_STR,
        name: queryName,
        variables: variables
    };
}
/**
 * Converts serialized ref to query ref
 * @param serializedRef ref to convert to `QueryRef`
 * @returns `QueryRef`
 */
function toQueryRef(serializedRef) {
    const { refInfo: { name, variables, connectorConfig } } = serializedRef;
    return queryRef(getDataConnect(connectorConfig), name, variables);
}

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
/**
 * The generated SDK will allow the user to pass in either the variable or the data connect instance with the variable,
 * and this function validates the variables and returns back the DataConnect instance and variables based on the arguments passed in.
 * @param connectorConfig
 * @param dcOrVars
 * @param vars
 * @param validateVars
 * @returns {DataConnect} and {Variables} instance
 * @internal
 */
function validateArgs(connectorConfig, dcOrVars, vars, validateVars) {
    let dcInstance;
    let realVars;
    if (dcOrVars && 'enableEmulator' in dcOrVars) {
        dcInstance = dcOrVars;
        realVars = vars;
    }
    else {
        dcInstance = getDataConnect(connectorConfig);
        realVars = dcOrVars;
    }
    if (!dcInstance || (!realVars && validateVars)) {
        throw new DataConnectError(Code.INVALID_ARGUMENT, 'Variables required.');
    }
    return { dc: dcInstance, vars: realVars };
}

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
/**
 * Subscribe to a `QueryRef`
 * @param queryRefOrSerializedResult query ref or serialized result.
 * @param observerOrOnNext observer object or next function.
 * @param onError Callback to call when error gets thrown.
 * @param onComplete Called when subscription completes.
 * @returns `SubscriptionOptions`
 */
function subscribe(queryRefOrSerializedResult, observerOrOnNext, onError, onComplete) {
    let ref;
    let initialCache;
    if ('refInfo' in queryRefOrSerializedResult) {
        const serializedRef = queryRefOrSerializedResult;
        const { data, source, fetchTime } = serializedRef;
        initialCache = {
            data,
            source,
            fetchTime
        };
        ref = toQueryRef(serializedRef);
    }
    else {
        ref = queryRefOrSerializedResult;
    }
    let onResult = undefined;
    if (typeof observerOrOnNext === 'function') {
        onResult = observerOrOnNext;
    }
    else {
        onResult = observerOrOnNext.onNext;
        onError = observerOrOnNext.onErr;
        onComplete = observerOrOnNext.onComplete;
    }
    if (!onResult) {
        throw new DataConnectError(Code.INVALID_ARGUMENT, 'Must provide onNext');
    }
    return ref.dataConnect._queryManager.addSubscription(ref, onResult, onComplete, onError, initialCache);
}

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
initializeFetch(fetch);
registerDataConnect('node');

exports.CallerSdkTypeEnum = CallerSdkTypeEnum;
exports.Code = Code;
exports.DataConnect = DataConnect;
exports.DataConnectError = DataConnectError;
exports.DataConnectOperationError = DataConnectOperationError;
exports.MUTATION_STR = MUTATION_STR;
exports.MutationManager = MutationManager;
exports.QUERY_STR = QUERY_STR;
exports.SOURCE_CACHE = SOURCE_CACHE;
exports.SOURCE_SERVER = SOURCE_SERVER;
exports.areTransportOptionsEqual = areTransportOptionsEqual;
exports.connectDataConnectEmulator = connectDataConnectEmulator;
exports.executeMutation = executeMutation;
exports.executeQuery = executeQuery;
exports.getDataConnect = getDataConnect;
exports.mutationRef = mutationRef;
exports.parseOptions = parseOptions;
exports.queryRef = queryRef;
exports.setLogLevel = setLogLevel;
exports.subscribe = subscribe;
exports.terminate = terminate;
exports.toQueryRef = toQueryRef;
exports.validateArgs = validateArgs;
exports.validateDCOptions = validateDCOptions;
//# sourceMappingURL=index.node.cjs.js.map
