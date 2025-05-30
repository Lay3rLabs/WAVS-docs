## all

::: sidebar-crate
## [wavs_wasi_utils](../wavs_wasi_utils/index.html)[0.4.0-beta.4]{.version}
:::

::: sidebar-elems
::: {#rustdoc-toc .section}
### [Crate Items](#macros)

-   [Macros](#macros "Macros")
-   [Functions](#functions "Functions")
:::

::: {#rustdoc-modnav}
:::
:::

::: sidebar-resizer
:::

::: {role="main"}
::: width-limiter
::: {#main-content .section .content}
# List of all items

### Macros

-   [decode_event_log_data](macro.decode_event_log_data.html)

### Functions

-   [evm::event::decode_event_log_data_raw](evm/event/fn.decode_event_log_data_raw.html)
-   [evm::new_evm_provider](evm/fn.new_evm_provider.html)
-   [http::fetch_bytes](http/fn.fetch_bytes.html)
-   [http::fetch_json](http/fn.fetch_json.html)
-   [http::fetch_string](http/fn.fetch_string.html)
-   [http::http_request_get](http/fn.http_request_get.html)
-   [http::http_request_post_form](http/fn.http_request_post_form.html)
-   [http::http_request_post_json](http/fn.http_request_post_json.html)
:::
:::
:::
## Macro: decode_event_log_data!

Redirecting to [macro.decode_event_log_data.html](macro.decode_event_log_data.html)\...
## Macro: decode_event_log_data

::: sidebar-crate
## [wavs_wasi_utils](../wavs_wasi_utils/index.html)[0.4.0-beta.4]{.version}
:::

::: sidebar-elems
::: {#rustdoc-toc .section}
## [decode_event_log_data](#) {#decode_event_log_data .location}

### [Sections](#)

-   [Example](#example "Example")
:::

::: {#rustdoc-modnav}
## [In crate wavs_wasi_utils](index.html) {#in-crate-wavs_wasi_utils .in-crate}
:::
:::

::: sidebar-resizer
:::

::: {role="main"}
::: width-limiter
::: {#main-content .section .content}
::: main-heading
::: rustdoc-breadcrumbs
[wavs_wasi_utils](index.html)
:::

# Macro [decode_event_log_data]{.macro}Copy item path

[[Source](../src/wavs_wasi_utils/evm/event.rs.html#16-26){.src} ]{.sub-heading}
:::

``` {.rust .item-decl}
macro_rules! decode_event_log_data {
    ($log_data:expr) => { ... };
}
```

Expand description

::: docblock
Decode a given `log_data` into a typed event `T`.

The log data comes from the WIT bindings at https://wa.dev/wavs:worker#layer-types-evm-event-log-data

-   `topics` should be a Vec\<Vec\>\`.
-   `data` should be a `Vec<u8>`.

`T` should be a type that implements `SolEvent`.

## [§](#example){.doc-anchor}Example

::: {.example-wrap .ignore}
[ⓘ](# "This example is not tested"){.tooltip}

``` {.rust .rust-example-rendered}
let event:MyEvent = decode_event_log_data!(log_data)?;
```
:::
:::
:::
:::
:::
## Function: decode_event_log_data_raw

::: sidebar-crate
## [wavs_wasi_utils](../../../wavs_wasi_utils/index.html)[0.4.0-beta.4]{.version}
:::

::: sidebar-elems
::: {#rustdoc-modnav}
## [In wavs_wasi_utils::evm::event](index.html)
:::
:::

::: sidebar-resizer
:::

::: {role="main"}
::: width-limiter
::: {#main-content .section .content}
::: main-heading
::: rustdoc-breadcrumbs
[wavs_wasi_utils](../../index.html)::[evm](../index.html)::[event](index.html)
:::

# Function [decode_event_log_data_raw]{.fn}Copy item path

[[Source](../../../src/wavs_wasi_utils/evm/event.rs.html#31-39){.src} ]{.sub-heading}
:::

``` {.rust .item-decl}
pub fn decode_event_log_data_raw<T: SolEvent>(
    topics: Vec<FixedBytes<32>>,
    data: Bytes,
) -> Result<T>
```
:::
:::
:::
## Function: fetch_bytes

::: sidebar-crate
## [wavs_wasi_utils](../../wavs_wasi_utils/index.html)[0.4.0-beta.4]{.version}
:::

::: sidebar-elems
::: {#rustdoc-modnav}
## [In wavs_wasi_utils::http](index.html)
:::
:::

::: sidebar-resizer
:::

::: {role="main"}
::: width-limiter
::: {#main-content .section .content}
::: main-heading
::: rustdoc-breadcrumbs
[wavs_wasi_utils](../index.html)::[http](index.html)
:::

# Function [fetch_bytes]{.fn}Copy item path

[[Source](../../src/wavs_wasi_utils/http.rs.html#46-54){.src} ]{.sub-heading}
:::

``` {.rust .item-decl}
pub async fn fetch_bytes(request: Request<impl Body>) -> Result<Vec<u8>>
```

Expand description

::: docblock
Fetch a request (typically constructed from one of the http_request\_\* helpers) Returns raw bytes
:::
:::
:::
:::
## Function: fetch_json

::: sidebar-crate
## [wavs_wasi_utils](../../wavs_wasi_utils/index.html)[0.4.0-beta.4]{.version}
:::

::: sidebar-elems
::: {#rustdoc-modnav}
## [In wavs_wasi_utils::http](index.html)
:::
:::

::: sidebar-resizer
:::

::: {role="main"}
::: width-limiter
::: {#main-content .section .content}
::: main-heading
::: rustdoc-breadcrumbs
[wavs_wasi_utils](../index.html)::[http](index.html)
:::

# Function [fetch_json]{.fn}Copy item path

[[Source](../../src/wavs_wasi_utils/http.rs.html#58-62){.src} ]{.sub-heading}
:::

``` {.rust .item-decl}
pub async fn fetch_json<T: DeserializeOwned>(
    request: Request<impl Body>,
) -> Result<T>
```

Expand description

::: docblock
Fetch a request (typically constructed from one of the http_request\_\* helpers) Deserializes the response into a JSON type
:::
:::
:::
:::
## Function: fetch_string

::: sidebar-crate
## [wavs_wasi_utils](../../wavs_wasi_utils/index.html)[0.4.0-beta.4]{.version}
:::

::: sidebar-elems
::: {#rustdoc-modnav}
## [In wavs_wasi_utils::http](index.html)
:::
:::

::: sidebar-resizer
:::

::: {role="main"}
::: width-limiter
::: {#main-content .section .content}
::: main-heading
::: rustdoc-breadcrumbs
[wavs_wasi_utils](../index.html)::[http](index.html)
:::

# Function [fetch_string]{.fn}Copy item path

[[Source](../../src/wavs_wasi_utils/http.rs.html#66-70){.src} ]{.sub-heading}
:::

``` {.rust .item-decl}
pub async fn fetch_string(request: Request<impl Body>) -> Result<String>
```

Expand description

::: docblock
Fetch a request (typically constructed from one of the http_request\_\* helpers) Deserializes the response into a UTF-8 string
:::
:::
:::
:::
## Function: http_request_get

::: sidebar-crate
## [wavs_wasi_utils](../../wavs_wasi_utils/index.html)[0.4.0-beta.4]{.version}
:::

::: sidebar-elems
::: {#rustdoc-modnav}
## [In wavs_wasi_utils::http](index.html)
:::
:::

::: sidebar-resizer
:::

::: {role="main"}
::: width-limiter
::: {#main-content .section .content}
::: main-heading
::: rustdoc-breadcrumbs
[wavs_wasi_utils](../index.html)::[http](index.html)
:::

# Function [http_request_get]{.fn}Copy item path

[[Source](../../src/wavs_wasi_utils/http.rs.html#10-12){.src} ]{.sub-heading}
:::

``` {.rust .item-decl}
pub fn http_request_get(url: &str) -> Result<Request<Empty>>
```

Expand description

::: docblock
Helper to just get a url
:::
:::
:::
:::
## Function: http_request_post_form

::: sidebar-crate
## [wavs_wasi_utils](../../wavs_wasi_utils/index.html)[0.4.0-beta.4]{.version}
:::

::: sidebar-elems
::: {#rustdoc-modnav}
## [In wavs_wasi_utils::http](index.html)
:::
:::

::: sidebar-resizer
:::

::: {role="main"}
::: width-limiter
::: {#main-content .section .content}
::: main-heading
::: rustdoc-breadcrumbs
[wavs_wasi_utils](../index.html)::[http](index.html)
:::

# Function [http_request_post_form]{.fn}Copy item path

[[Source](../../src/wavs_wasi_utils/http.rs.html#27-42){.src} ]{.sub-heading}
:::

``` {.rust .item-decl}
pub fn http_request_post_form(
    url: &str,
    form_data: impl IntoIterator<Item = (String, String)>,
) -> Result<Request<BoundedBody<Vec<u8>>>>
```

Expand description

::: docblock
Helper to post a url + form data (as www-form-urlencoded)
:::
:::
:::
:::
## Function: http_request_post_json

::: sidebar-crate
## [wavs_wasi_utils](../../wavs_wasi_utils/index.html)[0.4.0-beta.4]{.version}
:::

::: sidebar-elems
::: {#rustdoc-modnav}
## [In wavs_wasi_utils::http](index.html)
:::
:::

::: sidebar-resizer
:::

::: {role="main"}
::: width-limiter
::: {#main-content .section .content}
::: main-heading
::: rustdoc-breadcrumbs
[wavs_wasi_utils](../index.html)::[http](index.html)
:::

# Function [http_request_post_json]{.fn}Copy item path

[[Source](../../src/wavs_wasi_utils/http.rs.html#15-24){.src} ]{.sub-heading}
:::

``` {.rust .item-decl}
pub fn http_request_post_json(
    url: &str,
    body: impl Serialize,
) -> Result<Request<BoundedBody<Vec<u8>>>>
```

Expand description

::: docblock
Helper to post a url + json
:::
:::
:::
:::
# Module: wavs_wasi_utils

::: sidebar-crate
## [wavs_wasi_utils](../wavs_wasi_utils/index.html)[0.4.0-beta.4]{.version}
:::

::: sidebar-elems
-   [All Items](all.html){#all-types}

::: {#rustdoc-toc .section}
### [Crate Items](#modules)

-   [Modules](#modules "Modules")
-   [Macros](#macros "Macros")
:::

::: {#rustdoc-modnav}
:::
:::

::: sidebar-resizer
:::

::: {role="main"}
::: width-limiter
::: {#main-content .section .content}
::: main-heading
# Crate wavs_wasi_utilsCopy item path

[[Source](../src/wavs_wasi_utils/lib.rs.html#1-2){.src} ]{.sub-heading}
:::

## Modules[§](#modules){.anchor} {#modules .section-header}

[evm](evm/index.html "mod wavs_wasi_utils::evm"){.mod}\
[http](http/index.html "mod wavs_wasi_utils::http"){.mod}
:   HTTP helpers to make requests. Will eventually be deprecated by improvements to wstd, reqwest, etc.

## Macros[§](#macros){.anchor} {#macros .section-header}

[decode_event_log_data](macro.decode_event_log_data.html "macro wavs_wasi_utils::decode_event_log_data"){.macro}
:   Decode a given `log_data` into a typed event `T`.
:::
:::
:::
## Function: new_evm_provider

Redirecting to [../../../wavs_wasi_utils/evm/fn.new_evm_provider.html](../../../wavs_wasi_utils/evm/fn.new_evm_provider.html)\...
