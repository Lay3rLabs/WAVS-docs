# Crate Documentation

**Version:** 0.4.0-beta.4

**Format Version:** 43

# Module `wavs_wasi_utils`

## Modules

## Module `evm`

```rust
pub mod evm { /* ... */ }
```

### Modules

## Module `provider`

**Attributes:**

- `#[allow(unused_imports)]`
- `#[allow(dead_code)]`

```rust
pub(in ::evm) mod provider { /* ... */ }
```

### Functions

#### Function `new_evm_provider`

```rust
pub fn new_evm_provider<N: Network>(_endpoint: String) -> alloy_provider::RootProvider { /* ... */ }
```

## Module `event`

```rust
pub mod event { /* ... */ }
```

### Functions

#### Function `decode_event_log_data_raw`

```rust
pub fn decode_event_log_data_raw<T: alloy_sol_types::SolEvent>(topics: Vec<alloy_primitives::FixedBytes<32>>, data: alloy_primitives::Bytes) -> anyhow::Result<T> { /* ... */ }
```

### Re-exports

#### Re-export `alloy_primitives`

```rust
pub use alloy_primitives;
```

#### Re-export `provider::*`

```rust
pub use provider::*;
```

## Module `http`

HTTP helpers to make requests. Will eventually be deprecated by improvements to wstd, reqwest, etc.

```rust
pub mod http { /* ... */ }
```

### Functions

#### Function `http_request_get`

Helper to just get a url

```rust
pub fn http_request_get(url: &str) -> anyhow::Result<http::Request<wstd::io::Empty>> { /* ... */ }
```

#### Function `http_request_post_json`

Helper to post a url + json

```rust
pub fn http_request_post_json</* synthetic */ impl Serialize: Serialize>(url: &str, body: impl Serialize) -> anyhow::Result<http::Request<wstd::http::body::BoundedBody<Vec<u8>>>> { /* ... */ }
```

#### Function `http_request_post_form`

Helper to post a url + form data (as www-form-urlencoded)

```rust
pub fn http_request_post_form</* synthetic */ impl IntoIterator<Item = (String, String)>: IntoIterator<Item = (String, String)>>(url: &str, form_data: impl IntoIterator<Item = (String, String)>) -> anyhow::Result<http::Request<wstd::http::body::BoundedBody<Vec<u8>>>> { /* ... */ }
```

#### Function `fetch_bytes`

Fetch a request (typically constructed from one of the http_request_* helpers)
Returns raw bytes

```rust
pub async fn fetch_bytes</* synthetic */ impl Body: Body>(request: http::Request<impl Body>) -> anyhow::Result<Vec<u8>> { /* ... */ }
```

#### Function `fetch_json`

Fetch a request (typically constructed from one of the http_request_* helpers)
Deserializes the response into a JSON type

```rust
pub async fn fetch_json<T: DeserializeOwned, /* synthetic */ impl Body: Body>(request: http::Request<impl Body>) -> anyhow::Result<T> { /* ... */ }
```

#### Function `fetch_string`

Fetch a request (typically constructed from one of the http_request_* helpers)
Deserializes the response into a UTF-8 string

```rust
pub async fn fetch_string</* synthetic */ impl Body: Body>(request: http::Request<impl Body>) -> anyhow::Result<String> { /* ... */ }
```

## Macros

### Macro `decode_event_log_data`

**Attributes:**

- `#[macro_export]`

Decode a given `log_data` into a typed event `T`.

The log data comes from the WIT bindings at https://wa.dev/wavs:worker#layer-types-evm-event-log-data
* `topics` should be a Vec<Vec<u8>>`.
* `data` should be a `Vec<u8>`.

`T` should be a type that implements `SolEvent`.

# Example

```ignore
let event:MyEvent = decode_event_log_data!(log_data)?;
```


```rust
pub macro_rules! decode_event_log_data {
    /* macro_rules! decode_event_log_data {
    ($log_data:expr) => { ... };
} */
}
```

