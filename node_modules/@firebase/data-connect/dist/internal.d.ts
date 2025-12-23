/**
 * Firebase Data Connect
 *
 * @packageDocumentation
 */

import { AppCheckInternalComponentName } from '@firebase/app-check-interop-types';
import { AppCheckTokenListener } from '@firebase/app-check-interop-types';
import { AppCheckTokenResult } from '@firebase/app-check-interop-types';
import { FirebaseApp } from '@firebase/app';
import { FirebaseAuthInternalName } from '@firebase/auth-interop-types';
import { FirebaseAuthTokenData } from '@firebase/auth-interop-types';
import { FirebaseError } from '@firebase/util';
import { LogLevelString } from '@firebase/logger';
import { Provider } from '@firebase/component';

/**
 * @internal
 * Abstraction around AppCheck's token fetching capabilities.
 */
declare class AppCheckTokenProvider {
    private appCheckProvider?;
    private appCheck?;
    private serverAppAppCheckToken?;
    constructor(app: FirebaseApp, appCheckProvider?: Provider<AppCheckInternalComponentName> | undefined);
    getToken(): Promise<AppCheckTokenResult | null>;
    addTokenChangeListener(listener: AppCheckTokenListener): void;
}

/**
 * @internal
 * @param transportOptions1
 * @param transportOptions2
 * @returns
 */
export declare function areTransportOptionsEqual(transportOptions1: TransportOptions, transportOptions2: TransportOptions): boolean;

declare type AuthTokenListener = (token: string | null) => void;

declare interface AuthTokenProvider {
    getToken(forceRefresh: boolean): Promise<FirebaseAuthTokenData | null>;
    addTokenChangeListener(listener: AuthTokenListener): void;
}

/**
 * enum representing different flavors of the SDK used by developers
 * use the CallerSdkType for type-checking, and the CallerSdkTypeEnum for value-checking/assigning
 */
export declare type CallerSdkType = 'Base' | 'Generated' | 'TanstackReactCore' | 'GeneratedReact' | 'TanstackAngularCore' | 'GeneratedAngular';

export declare const CallerSdkTypeEnum: {
    readonly Base: "Base";
    readonly Generated: "Generated";
    readonly TanstackReactCore: "TanstackReactCore";
    readonly GeneratedReact: "GeneratedReact";
    readonly TanstackAngularCore: "TanstackAngularCore";
    readonly GeneratedAngular: "GeneratedAngular";
};

export declare type Code = DataConnectErrorCode;

export declare const Code: {
    OTHER: DataConnectErrorCode;
    ALREADY_INITIALIZED: DataConnectErrorCode;
    NOT_INITIALIZED: DataConnectErrorCode;
    NOT_SUPPORTED: DataConnectErrorCode;
    INVALID_ARGUMENT: DataConnectErrorCode;
    PARTIAL_ERROR: DataConnectErrorCode;
    UNAUTHORIZED: DataConnectErrorCode;
};

/**
 * Connect to the DataConnect Emulator
 * @param dc Data Connect instance
 * @param host host of emulator server
 * @param port port of emulator server
 * @param sslEnabled use https
 */
export declare function connectDataConnectEmulator(dc: DataConnect, host: string, port?: number, sslEnabled?: boolean): void;

/**
 * Connector Config for calling Data Connect backend.
 */
export declare interface ConnectorConfig {
    location: string;
    connector: string;
    service: string;
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

/** An error returned by a DataConnect operation. */
export declare class DataConnectError extends FirebaseError {
    /** @internal */
    readonly name: string;
    constructor(code: Code, message: string);
    /** @internal */
    toString(): string;
}

export declare type DataConnectErrorCode = 'other' | 'already-initialized' | 'not-initialized' | 'not-supported' | 'invalid-argument' | 'partial-error' | 'unauthorized';

/** An error returned by a DataConnect operation. */
export declare class DataConnectOperationError extends DataConnectError {
    /** @internal */
    readonly name: string;
    /** The response received from the backend. */
    readonly response: DataConnectOperationFailureResponse;
    /** @hideconstructor */
    constructor(message: string, response: DataConnectOperationFailureResponse);
}

export declare interface DataConnectOperationFailureResponse {
    readonly data?: Record<string, unknown> | null;
    readonly errors: DataConnectOperationFailureResponseErrorInfo[];
}

export declare interface DataConnectOperationFailureResponseErrorInfo {
    readonly message: string;
    readonly path: Array<string | number>;
}

/**
 * DataConnectOptions including project id
 */
export declare interface DataConnectOptions extends ConnectorConfig {
    projectId: string;
}

export declare interface DataConnectResult<Data, Variables> extends OpResult<Data> {
    ref: OperationRef<Data, Variables>;
}

/**
 * Representation of user provided subscription options.
 */
declare interface DataConnectSubscription<Data, Variables> {
    userCallback: OnResultSubscription<Data, Variables>;
    errCallback?: (e?: DataConnectError) => void;
    onCompleteCallback?: () => void;
    unsubscribe: () => void;
}

/**
 * @internal
 */
export declare interface DataConnectTransport {
    invokeQuery<T, U>(queryName: string, body?: U): Promise<{
        data: T;
        errors: Error[];
    }>;
    invokeMutation<T, U>(queryName: string, body?: U): Promise<{
        data: T;
        errors: Error[];
    }>;
    useEmulator(host: string, port?: number, sslEnabled?: boolean): void;
    onTokenChanged: (token: string | null) => void;
    _setCallerSdkType(callerSdkType: CallerSdkType): void;
}

export declare type DataSource = typeof SOURCE_CACHE | typeof SOURCE_SERVER;

/**
 * Execute Mutation
 * @param mutationRef mutation to execute
 * @returns `MutationRef`
 */
export declare function executeMutation<Data, Variables>(mutationRef: MutationRef<Data, Variables>): MutationPromise<Data, Variables>;

/**
 * Execute Query
 * @param queryRef query to execute.
 * @returns `QueryPromise`
 */
export declare function executeQuery<Data, Variables>(queryRef: QueryRef<Data, Variables>): QueryPromise<Data, Variables>;

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

export declare const MUTATION_STR = "mutation";

/**
 * @internal
 */
export declare class MutationManager {
    private _transport;
    private _inflight;
    constructor(_transport: DataConnectTransport);
    executeMutation<Data, Variables>(mutationRef: MutationRef<Data, Variables>): MutationPromise<Data, Variables>;
}

/**
 * Mutation return value from `executeMutation`
 */
export declare interface MutationPromise<Data, Variables> extends Promise<MutationResult<Data, Variables>> {
}

export declare interface MutationRef<Data, Variables> extends OperationRef<Data, Variables> {
    refType: typeof MUTATION_STR;
}

/**
 * Creates a `MutationRef`
 * @param dcInstance Data Connect instance
 * @param mutationName name of mutation
 */
export declare function mutationRef<Data>(dcInstance: DataConnect, mutationName: string): MutationRef<Data, undefined>;

/**
 *
 * @param dcInstance Data Connect instance
 * @param mutationName name of mutation
 * @param variables variables to send with mutation
 */
export declare function mutationRef<Data, Variables>(dcInstance: DataConnect, mutationName: string, variables: Variables): MutationRef<Data, Variables>;

/**
 * Mutation Result from `executeMutation`
 */
export declare interface MutationResult<Data, Variables> extends DataConnectResult<Data, Variables> {
    ref: MutationRef<Data, Variables>;
}

/**
 * `OnCompleteSubscription`
 */
export declare type OnCompleteSubscription = () => void;

/**
 * Signature for `OnErrorSubscription` for `subscribe`
 */
export declare type OnErrorSubscription = (err?: DataConnectError) => void;

/**
 * Signature for `OnResultSubscription` for `subscribe`
 */
export declare type OnResultSubscription<Data, Variables> = (res: QueryResult<Data, Variables>) => void;

export declare interface OperationRef<_Data, Variables> {
    name: string;
    variables: Variables;
    refType: ReferenceType;
    dataConnect: DataConnect;
}

export declare interface OpResult<Data> {
    data: Data;
    source: DataSource;
    fetchTime: string;
}

declare interface ParsedArgs<Variables> {
    dc: DataConnect;
    vars: Variables;
}

/**
 *
 * @param fullHost
 * @returns TransportOptions
 * @internal
 */
export declare function parseOptions(fullHost: string): TransportOptions;

export declare const QUERY_STR = "query";

declare class QueryManager {
    private transport;
    _queries: Map<string, TrackedQuery<unknown, unknown>>;
    constructor(transport: DataConnectTransport);
    track<Data, Variables>(queryName: string, variables: Variables, initialCache?: OpResult<Data>): TrackedQuery<Data, Variables>;
    addSubscription<Data, Variables>(queryRef: OperationRef<Data, Variables>, onResultCallback: OnResultSubscription<Data, Variables>, onCompleteCallback?: OnCompleteSubscription, onErrorCallback?: OnErrorSubscription, initialCache?: OpResult<Data>): () => void;
    executeQuery<Data, Variables>(queryRef: QueryRef<Data, Variables>): QueryPromise<Data, Variables>;
    enableEmulator(host: string, port: number): void;
}

/**
 * Promise returned from `executeQuery`
 */
export declare interface QueryPromise<Data, Variables> extends Promise<QueryResult<Data, Variables>> {
}

/**
 * QueryRef object
 */
export declare interface QueryRef<Data, Variables> extends OperationRef<Data, Variables> {
    refType: typeof QUERY_STR;
}

/**
 * Execute Query
 * @param dcInstance Data Connect instance to use.
 * @param queryName Query to execute
 * @returns `QueryRef`
 */
export declare function queryRef<Data>(dcInstance: DataConnect, queryName: string): QueryRef<Data, undefined>;

/**
 * Execute Query
 * @param dcInstance Data Connect instance to use.
 * @param queryName Query to execute
 * @param variables Variables to execute with
 * @returns `QueryRef`
 */
export declare function queryRef<Data, Variables>(dcInstance: DataConnect, queryName: string, variables: Variables): QueryRef<Data, Variables>;

/**
 * Result of `executeQuery`
 */
export declare interface QueryResult<Data, Variables> extends DataConnectResult<Data, Variables> {
    ref: QueryRef<Data, Variables>;
    toJSON: () => SerializedRef<Data, Variables>;
}

/**
 * Signature for unsubscribe from `subscribe`
 */
export declare type QueryUnsubscribe = () => void;

export declare type ReferenceType = typeof QUERY_STR | typeof MUTATION_STR;

/**
 * Serialized RefInfo as a result of `QueryResult.toJSON().refInfo`
 */
export declare interface RefInfo<Variables> {
    name: string;
    variables: Variables;
    connectorConfig: DataConnectOptions;
}

/**
 * Serialized Ref as a result of `QueryResult.toJSON()`
 */
export declare interface SerializedRef<Data, Variables> extends OpResult<Data> {
    refInfo: RefInfo<Variables>;
}

export declare function setLogLevel(logLevel: LogLevelString): void;

export declare const SOURCE_CACHE = "CACHE";

export declare const SOURCE_SERVER = "SERVER";

/**
 * Subscribe to a `QueryRef`
 * @param queryRefOrSerializedResult query ref or serialized result.
 * @param observer observer object to use for subscribing.
 * @returns `SubscriptionOptions`
 */
export declare function subscribe<Data, Variables>(queryRefOrSerializedResult: QueryRef<Data, Variables> | SerializedRef<Data, Variables>, observer: SubscriptionOptions<Data, Variables>): QueryUnsubscribe;

/**
 * Subscribe to a `QueryRef`
 * @param queryRefOrSerializedResult query ref or serialized result.
 * @param onNext Callback to call when result comes back.
 * @param onError Callback to call when error gets thrown.
 * @param onComplete Called when subscription completes.
 * @returns `SubscriptionOptions`
 */
export declare function subscribe<Data, Variables>(queryRefOrSerializedResult: QueryRef<Data, Variables> | SerializedRef<Data, Variables>, onNext: OnResultSubscription<Data, Variables>, onError?: OnErrorSubscription, onComplete?: OnCompleteSubscription): QueryUnsubscribe;

/**
 * Representation of full observer options in `subscribe`
 */
export declare interface SubscriptionOptions<Data, Variables> {
    onNext?: OnResultSubscription<Data, Variables>;
    onErr?: OnErrorSubscription;
    onComplete?: OnCompleteSubscription;
}

/**
 * Delete DataConnect instance
 * @param dataConnect DataConnect instance
 * @returns
 */
export declare function terminate(dataConnect: DataConnect): Promise<void>;

/**
 * Converts serialized ref to query ref
 * @param serializedRef ref to convert to `QueryRef`
 * @returns `QueryRef`
 */
export declare function toQueryRef<Data, Variables>(serializedRef: SerializedRef<Data, Variables>): QueryRef<Data, Variables>;

declare interface TrackedQuery<Data, Variables> {
    ref: Omit<OperationRef<Data, Variables>, 'dataConnect'>;
    subscriptions: Array<DataConnectSubscription<Data, Variables>>;
    currentCache: OpResult<Data> | null;
    lastError: DataConnectError | null;
}

/**
 * @internal
 */
export declare type TransportClass = new (options: DataConnectOptions, apiKey?: string, appId?: string, authProvider?: AuthTokenProvider, appCheckProvider?: AppCheckTokenProvider, transportOptions?: TransportOptions, _isUsingGen?: boolean, _callerSdkType?: CallerSdkType) => DataConnectTransport;

/**
 * Options to connect to emulator
 */
export declare interface TransportOptions {
    host: string;
    sslEnabled?: boolean;
    port?: number;
}

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
export declare function validateArgs<Variables extends object>(connectorConfig: ConnectorConfig, dcOrVars?: DataConnect | Variables, vars?: Variables, validateVars?: boolean): ParsedArgs<Variables>;

/**
 *
 * @param dcOptions
 * @returns {void}
 * @internal
 */
export declare function validateDCOptions(dcOptions: ConnectorConfig): boolean;

export { }
