News API Specification
=========

##Resources and responses

- /news/ is the landing point, and should contain hyperlinks to previews and stories
```
{
  '_links':{'stories':{'href':'/news/stories'}}
}
```
- /news/stories is the story listing landing point, and should contain hyperlinks to the published, pending, and rejected listings
```
{
  '_links':{
    'pending':{
      'href':'/news/stories/pending'
    },
    'published':{
      'href':'/news/stories/pending'
    },
    'rejected':{
      'href':'/news/stories/pending'
    }
  }
}
```
 - Each listing resource should contain a self link, and an embedded list of stories with links to their full versions and their previews. The stories on each page may exist for as long as the server decides to retain them there. The embedded story info must include the id, headline, and link. A listing may be cached for up to 1 minute. An example of the pending listing:
  ```
  {
    '_embedded':{
      'stories':{[
        {
          'id':'123',
          'headline':'Test',
          'link':'Test',
          '_links':{
            'self':{'href':'/news/stories/pending/123'},
            'preview':{'href':'/news/previews/123.png'}
          }
        }
      ]}
    },
    '_links':{'self':{'href':'/news/stories/pending'}}
  }
  ```
  - The dedicated story resource must include the status, id, headline, link, and metadata. It may include a note if there is one (currently only used for rejection). An example for a published story:
  ```
  {
    'id':'123',
    'status':'PUBLISHED',
    'headline':'Test',
    'link':'Test',
    'metadata':{
      'ingestionTime':123456789,
      'publishTime':123456799
    },
    '_links':{
      'self':{'href':'/news/stories/pending/123'},
      'preview':{'href':'/news/previews/123.png'}
    }
  }
  ```
  If a story was pending but has been processed, then the response code should be a ```301 MOVED PERMANENTLY``` redirect to the correct URI (this includes stories that have expired). If a published or rejected story has expired and is not available anymore, then a ```410 GONE``` should be returned with an error message. If the story never existed to begin with, a ```404 NOT FOUND``` should be returned. If a story is requested with /news/stories/pending and the story was approved AND expired, then the 301 should still redirect them to the next location, where they will be served the 410 response. Stories that are pending should return a ```202 ACCEPTED``` status code. Rejected stories should return a ```422 UNPROCESSABLE ENTITY```. Published stories should return a ```200 OK```.

    The story resource has a few particularly important fields:
   - The id is unique among all stories submitted for all time, but its value is up to the server to assign. Any value may be used (UUID is suggested).
   - The preview link should be included ONLY for published stories, but it is required in that case.
   - The note is optional, but usually will be included with rejected stories as the reason why the story was rejected.
   - Metadata consists entirely of timestamps for certain events, in UNIX timestamp format (milliseconds since January 1st, 1970). Any metadata that is null/non-existent should be excluded from the response, these should ALWAYS be valid long integers. This means a story cannot have both publishTime and rejectionTime.
    - ingestionTime is the moment that the story was received by the API
    - publishTime is the moment that the story was made available over /news/stories/published
    - rejectionTime is the moment that the story was made available over /news/stories/rejected
    - expirationTime is the earliest moment that the story may be removed from the API (it may be removed after this time, but clients should assume that it will never be available after this time). This is valid only for published and rejected stories, and is required in these cases.  


  - Preview resources are images, and may be any image format, although PNG is suggested. The response should use the correct Content-Type headers. The only way to discover a preview resource is through the story resources links, so each preview only needs to be served as long as the corresponding story is served. If the story it corresponds to is expired, then this should return a ```410 GONE``` and no binary data. If a story is pending or rejected, or never existed, then there should be no preview and a ```404 NOT FOUND``` should be returned. The preview should be an image representation of the URL stored in the corresponding stories ```link``` field. The image dimensions should be at least 300px wide and 150px tall, and a 16:9 aspect ratio is preferable. The process for generating the image is up to the server, and there is no requirement that the image be immutable (this means that the server could store one image for multiple stories that use the same link, and update each time a new one is submitted)

- /news/stories/pending accepts POST requests with new stories. They should be in some acceptable format. Once the story has been queued up for processing, this should always return a ```201 CREATED``` and a Location header directing the client to the newly created pending story page. For example, if the story was assigned an id of '5', the client should receive a ```Location: /news/stories/pending/5``` header. Once the POST is complete, the client may check the status of the story by sending a HEAD request to the returned location. When the story has been processed, it will stop returning the 202 status and instead return a 301 redirect to inform the client of the final status. If the final response code is 422, it was rejected, if it is 200 then it was published successfully. Any and all issues with a submitted story should be reported via the note field of a rejected story.

##Caching
Caching is optional, and generally up to the server to decide on. There are a few restrictions:
- Listings should not be cached for more than 1 minute, unless there is a known rule for expiration times that allows for a larger cache period sometimes.
- Pending stories should never be cached.
- Published and rejected stories may be cached up until the known expiration time, as they are immutable until then.
- Previews may be cached until they expire.
