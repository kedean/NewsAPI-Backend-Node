var util = require('../util/util');

var Status = {
  Pending:'PENDING',
  Rejected:'REJECTED',
  Published:'PUBLISHED',
  Archived:'ARCHIVED',
  fromString:function(name){
    name = name.toLowerCase();
    if(name == 'pending'){
      return this.Pending;
    } else if(name == 'rejected'){
      return this.Rejected;
    } else if(name == 'published'){
      return this.Published;
    } else if(name == 'archived'){
      return this.Archived;
    } else{
      throw "Unknown status name";
    }
  }
};
exports.Status = Status;

exports.root = function(req){
  return {
    '_links':{
      'self':{
        'href':util.buildUrl(req, '/news/')
      },
      'stories':{
        'href':util.buildUrl(req, '/news/stories')
      }
    }
  }
}

exports.stories = function(req){
  return {
    '_links':{
      'self':{
        'href':util.buildUrl(req, '/news/stories/')
      },
      'pending':{
        'href':util.buildUrl(req, '/news/stories/pending')
      },
      'published':{
        'href':util.buildUrl(req, '/news/stories/published')
      },
      'rejected':{
        'href':util.buildUrl(req, '/news/stories/rejected')
      }
    }
  }
}

/**
 * Outputs a HATEOAS/HAL-compliant listing resource for the given stories
 * @param req the request that generated this call
 * @param listingType the type of listing, should be a value from the Status enum
 * @param stories an array of stories to wrap, this array will be modified in place for performance reasons! If this will cause problems, do a deep close of the array before passing it in
 * @returns a JSON representation of the listing
 */
exports.buildListing = function(req, listingType, stories){
  var status = Status.fromString(listingType);

  stories.forEach(function(item){
    item['_links'] = {
      'self':util.buildUrl(req, req.originalUrl + '/' + item.id)
    };

    if(status == Status.Published){
      item['_links']['preview'] = util.buildUrl(req, '/news/previews/' + item.id + '.png');
    }
  });

  return {
    '_embedded':{
      'stories':stories
    },
    '_links':{
      'self':{
        'href':util.buildUrl(req, req.originalUrl)
      }
    }
  }
}
