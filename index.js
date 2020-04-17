addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})
/**
 * Respond with hello worker text
 * @param {Request} request
 */
async function handleRequest(request) {
  try {
    let cookie_present = false;
    const cookie = request.headers.get('cookie');
    
    if (cookie && cookie.includes("idx")){
      cookie_present = true;
    }

    // fetch the urls from the API
    let api_response = await make_url_fetch_request('https://cfw-takehome.developers.workers.dev/api/variants');
    // fetch urls json from response object 
    const urls = await api_response.json();
    // get the url index to choose particular variant from the array of two urls based on previous set cookie or random even distribution
    let url_idx = get_url_index(cookie);
    // get the variant url to make request for rendering variant webpage 
    let selected_variant_url = extract_variant_url(urls, url_idx);
    // fetch the variant response
    if (selected_variant_url) {
      let page_response = await make_url_fetch_request(selected_variant_url);
      if (!cookie_present) {
        // set cookie with url variant index to remember the variant next time same user hit the script (Extra Credit 2)
        page_response = new Response(page_response.body, page_response);
        page_response.headers.append('Set-Cookie', `idx=${url_idx}; path=/`);
      }

      // changing the default values of html elements to custom values using HTMLRewriter API (Extra Credit 1)
      return rewrite_response(page_response);
    } else {
      throw new Error("Some Error Occurred while extracting the variant url !!!");
    }
  } catch (err) {
    let err_response = new Response(`Fatal Error Occured!!! Error Details: ${err.message}`);
    err_response.headers.set('X-err', err);
    return err_response;
  }
}


// helper functions and classes

class InnerHTMLRewriter {
  constructor(content){
    this.content = content;
  }
  element(element) {
    element.setInnerContent(this.content);
  }
}

class AttributeRewriter {
  constructor(attr_name, attr_value){
    this.attr_name = attr_name;
    this.attr_value = attr_value;
  }
  element(element) {
    element.setAttribute(this.attr_name, this.attr_value);
  }
}

function rewrite_response(page_response) {
  return new HTMLRewriter()
    .on('title', new InnerHTMLRewriter("Pururaj Dave"))
    .on('h1#title', new InnerHTMLRewriter("LinkedIn Profile"))
    .on('p#description', new InnerHTMLRewriter("Click the below button to visit my LinkedIn Profile"))
    .on('a#url', new AttributeRewriter("href", "https://www.linkedin.com/in/pururaj-dave-3b5071125/"))
    .on('a#url', new InnerHTMLRewriter("Go to Pururaj Dave's LinkedIn Profile"))
    .transform(page_response);
}

function get_url_index(cookie) {
  let url_idx = 0;
  if (cookie && cookie.includes("idx=0")) {
    url_idx = 0;
  } else if (cookie && cookie.includes("idx=1")) {
    url_idx = 1;
  } else {
    // Distributing requests between two variants evenly with 50% probability
    url_idx = Math.random() < 0.5 ? 0 : 1;
  }
  return url_idx;
}

function extract_variant_url(urls, url_idx) {
  if (urls && urls.variants) {
    return urls.variants[url_idx];
  } else {
    return null;
  }
}

async function make_url_fetch_request(url) {
  let response = await fetch(url);
  if (!response.ok) {
    handle_error_response(response.status);
  }
  return response;
}

function handle_error_response(status="") {
  throw new Error(`Some Error Occured when hiting the API!!! Response Status: ${status}`);
}
