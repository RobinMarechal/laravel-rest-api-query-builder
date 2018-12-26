
# laravel-rest-api-query-builder

[![npm version](https://badge.fury.io/js/sarala.svg)](https://www.npmjs.com/package/sarala) [![apm](https://img.shields.io/apm/l/vim-mode.svg)](https://github.com/milroyfraser/sarala/blob/master/LICENSE)

> JavaScript library to build RESTful API HTTP calls with Eloquent's-like syntax. 
> This is made to work with RESTful APIs that use laravel-rest-api package. 

This package is just a modification to [milroyfraser/sarala](http://github.com/milroyfraser/sarala) in order to make it compatible with [laravel-rest-api](http://github.com/RobinMarechal/laravel-rest-api) package.

All credits goes to [milroyfraser](http://github.com/milroyfraser).

### [Original package's documentation](https://milroy.me/posts/sarala-laravel-eloquent-like-javascript-orm-to-communicate-with-json-api/1)

## Install

```sh
$ npm i laravel-rest-api-query-builder --save
```

```sh
$ yarn add laravel-rest-api-query-builder
```

# Basic Usage

## Model Implementation

##### app/models/BaseModel.js
```javascript
import Model from 'laravel-rest-api-query-builder';

export default class BaseModel extends Model
{
    getBaseUrl(){
        return "https://myserver.com/api";
    }
}
```

##### app/models/Post.js
```javascript
import Model from './BaseModel';
import Comment from './Comment';
import Tag from './Tag';
import User from './User';

export default class Post extends Model {
    getNamespace () {
        return 'posts';
    }

    getFields () {
        return ['title', 'subtitle', 'body', 'slug'];
    }

    getDates () {
	// one of 'datetime', 'date' and 'time'
        return { 
	    created_at: 'datetime',
	    updated_at: 'datetime'
        };
    }

    getRelations () {
        return {
            author: {
	        class: User,
	        list: false
            },
            tags: {
	        class: Tag,
	        list: true
            },
            comments: {
                class: Comment,
                list: true
	    },
        };
    }

    computed () {
        return {
            full_date (post) {
                return post.published_at.format('MMMM Do YYYY');
            },

            human_date (post) {
                return post.published_at.fromNow();
            }
        };
    }
}
```

##### app/models/Tag.js
```javascript
import Model from './BaseModel';
import Post from './Post';

export default class Tag extends Model {
    getNamespace () {
        return 'tags';
    }

    getFields () {
        return ['name'];
    }
    
    getRelations(){
	return {
	    posts: {
		class: Post,
		list: true
	    }
	}
    }
}
```

## Fetching data

```javascript
import Customer from './Customer';
import Post from './Post';
import { Query } from 'laravel-rest-api-query-builder'

// Get the post with id 7
Query.model(Post)
    .find(7)
    .then(post => console.log(post));

// Get all posts
Query.model(Post)
    .all()
    .then(posts => console.log(posts));

// Get all posts with their author and tags
Query.model(Post)
    .with('author', 'tags')
    .all()
    .then(posts => console.log(posts));

// Get, sort and limit
Query.model(Post)
    .orderBy('-id', 'title')
    .limit(10)
    .all()
    .then(posts => console.log(posts));

// Paginate : 10 per page, 5th page
Query.model(Post)
    .paginate(10, 5)
    .then(posts => console.log(posts));

// Get a post then get its author
Query.model(Post)
    .find(7)
    .then(post => Query.model(User).of(post).all())
    .then(users => console.log(users[0]));
```

## Insert

##### app/components/MyComponent.js
```javascript
import Tag from './../models/Tag';

const tag = new Tag();
tag.name = 'json-api';

// makes a POST request to https://sarala-demo.app/api/tags
tag.create()
    .then(tag => {
        tag.name = 'json-api-2';
        return tag.update();
    })
    .then(console.log); 

// save
const tag2 = new Tag();
tag2.name = 'tag2';
tag2.save()
    .then(tag => {
        tag.name = 'tag2-3';
        return tag.save();
    })
    .then(console.log); 
```

## Learn More: [Original package's documentation](https://milroy.me/posts/sarala-laravel-eloquent-like-javascript-orm-to-communicate-with-json-api/1)
