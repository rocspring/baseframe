;(function(undefined){
  if (String.prototype.trim === undefined) // fix for iOS 3.2
    String.prototype.trim = function(){ return this.replace(/^\s+|\s+$/g, '') }

  // For iOS 3.x
  // from https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/reduce
  if (Array.prototype.reduce === undefined)
    Array.prototype.reduce = function(fun){
      if(this === void 0 || this === null) throw new TypeError()
      var t = Object(this), len = t.length >>> 0, k = 0, accumulator
      if(typeof fun != 'function') throw new TypeError()
      if(len == 0 && arguments.length == 1) throw new TypeError()

      if(arguments.length >= 2)
       accumulator = arguments[1]
      else
        do{
          if(k in t){
            accumulator = t[k++]
            break
          }
          if(++k >= len) throw new TypeError()
        } while (true)

      while (k < len){
        if(k in t) accumulator = fun.call(undefined, accumulator, t[k], k, t)
        k++
      }
      return accumulator
    }

})()

var Zepto = (function() {
  var undefined, key, $, classList, emptyArray = [], slice = emptyArray.slice, filter = emptyArray.filter,
    document = window.document,
    elementDisplay = {}, classCache = {},
    getComputedStyle = document.defaultView.getComputedStyle,
    cssNumber = { 'column-count': 1, 'columns': 1, 'font-weight': 1, 'line-height': 1,'opacity': 1, 'z-index': 1, 'zoom': 1 },
    fragmentRE = /^\s*<(\w+|!)[^>]*>/,
    tagExpanderRE = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/ig,
    rootNodeRE = /^(?:body|html)$/i,

    // special attributes that should be get/set via method calls
    methodAttributes = ['val', 'css', 'html', 'text', 'data', 'width', 'height', 'offset'],

    adjacencyOperators = [ 'after', 'prepend', 'before', 'append' ],
    table = document.createElement('table'),
    tableRow = document.createElement('tr'),
    containers = {
      'tr': document.createElement('tbody'),
      'tbody': table, 'thead': table, 'tfoot': table,
      'td': tableRow, 'th': tableRow,
      '*': document.createElement('div')
    },
    readyRE = /complete|loaded|interactive/,
    classSelectorRE = /^\.([\w-]+)$/,
    idSelectorRE = /^#([\w-]*)$/,
    tagSelectorRE = /^[\w-]+$/,
    class2type = {},
    toString = class2type.toString,
    zepto = {},
    camelize, uniq,
    tempParent = document.createElement('div')

  zepto.matches = function(element, selector) {
    if (!element || element.nodeType !== 1) return false
    var matchesSelector = element.webkitMatchesSelector || element.mozMatchesSelector ||
                          element.oMatchesSelector || element.matchesSelector
    if (matchesSelector) return matchesSelector.call(element, selector)
    // fall back to performing a selector:
    var match, parent = element.parentNode, temp = !parent
    if (temp) (parent = tempParent).appendChild(element)
    match = ~zepto.qsa(parent, selector).indexOf(element)
    temp && tempParent.removeChild(element)
    return match
  }

  function type(obj) {
    return obj == null ? String(obj) :
      class2type[toString.call(obj)] || "object"
  }

  function isFunction(value) { return type(value) == "function" }
  function isWindow(obj)     { return obj != null && obj == obj.window }
  function isDocument(obj)   { return obj != null && obj.nodeType == obj.DOCUMENT_NODE }
  function isObject(obj)     { return type(obj) == "object" }
  function isPlainObject(obj) {
    return isObject(obj) && !isWindow(obj) && obj.__proto__ == Object.prototype
  }
  function isArray(value) { return value instanceof Array }
  function likeArray(obj) { return typeof obj.length == 'number' }

  function compact(array) { return filter.call(array, function(item){ return item != null }) }
  function flatten(array) { return array.length > 0 ? $.fn.concat.apply([], array) : array }
  camelize = function(str){ return str.replace(/-+(.)?/g, function(match, chr){ return chr ? chr.toUpperCase() : '' }) }
  function dasherize(str) {
    return str.replace(/::/g, '/')
           .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
           .replace(/([a-z\d])([A-Z])/g, '$1_$2')
           .replace(/_/g, '-')
           .toLowerCase()
  }
  uniq = function(array){ return filter.call(array, function(item, idx){ return array.indexOf(item) == idx }) }

  function classRE(name) {
    return name in classCache ?
      classCache[name] : (classCache[name] = new RegExp('(^|\\s)' + name + '(\\s|$)'))
  }

  function maybeAddPx(name, value) {
    return (typeof value == "number" && !cssNumber[dasherize(name)]) ? value + "px" : value
  }

  function defaultDisplay(nodeName) {
    var element, display
    if (!elementDisplay[nodeName]) {
      element = document.createElement(nodeName)
      document.body.appendChild(element)
      display = getComputedStyle(element, '').getPropertyValue("display")
      element.parentNode.removeChild(element)
      display == "none" && (display = "block")
      elementDisplay[nodeName] = display
    }
    return elementDisplay[nodeName]
  }

  function children(element) {
    return 'children' in element ?
      slice.call(element.children) :
      $.map(element.childNodes, function(node){ if (node.nodeType == 1) return node })
  }

  // `$.zepto.fragment` takes a html string and an optional tag name
  // to generate DOM nodes nodes from the given html string.
  // The generated DOM nodes are returned as an array.
  // This function can be overriden in plugins for example to make
  // it compatible with browsers that don't support the DOM fully.
  zepto.fragment = function(html, name, properties) {
    if (html.replace) html = html.replace(tagExpanderRE, "<$1></$2>")
    if (name === undefined) name = fragmentRE.test(html) && RegExp.$1
    if (!(name in containers)) name = '*'

    var nodes, dom, container = containers[name]
    container.innerHTML = '' + html
    dom = $.each(slice.call(container.childNodes), function(){
      container.removeChild(this)
    })
    if (isPlainObject(properties)) {
      nodes = $(dom)
      $.each(properties, function(key, value) {
        if (methodAttributes.indexOf(key) > -1) nodes[key](value)
        else nodes.attr(key, value)
      })
    }
    return dom
  }

  // `$.zepto.Z` swaps out the prototype of the given `dom` array
  // of nodes with `$.fn` and thus supplying all the Zepto functions
  // to the array. Note that `__proto__` is not supported on Internet
  // Explorer. This method can be overriden in plugins.
  zepto.Z = function(dom, selector) {
    dom = dom || []
    dom.__proto__ = $.fn
    dom.selector = selector || ''
    return dom
  }

  // `$.zepto.isZ` should return `true` if the given object is a Zepto
  // collection. This method can be overriden in plugins.
  zepto.isZ = function(object) {
    return object instanceof zepto.Z
  }

  // `$.zepto.init` is Zepto's counterpart to jQuery's `$.fn.init` and
  // takes a CSS selector and an optional context (and handles various
  // special cases).
  // This method can be overriden in plugins.
  zepto.init = function(selector, context) {
    // If nothing given, return an empty Zepto collection
    if (!selector) return zepto.Z()
    // If a function is given, call it when the DOM is ready
    else if (isFunction(selector)) return $(document).ready(selector)
    // If a Zepto collection is given, juts return it
    else if (zepto.isZ(selector)) return selector
    else {
      var dom
      // normalize array if an array of nodes is given
      if (isArray(selector)) dom = compact(selector)
      // Wrap DOM nodes. If a plain object is given, duplicate it.
      else if (isObject(selector))
        dom = [isPlainObject(selector) ? $.extend({}, selector) : selector], selector = null
      // If it's a html fragment, create nodes from it
      else if (fragmentRE.test(selector))
        dom = zepto.fragment(selector.trim(), RegExp.$1, context), selector = null
      // If there's a context, create a collection on that context first, and select
      // nodes from there
      else if (context !== undefined) return $(context).find(selector)
      // And last but no least, if it's a CSS selector, use it to select nodes.
      else dom = zepto.qsa(document, selector)
      // create a new Zepto collection from the nodes found
      return zepto.Z(dom, selector)
    }
  }

  // `$` will be the base `Zepto` object. When calling this
  // function just call `$.zepto.init, which makes the implementation
  // details of selecting nodes and creating Zepto collections
  // patchable in plugins.
  $ = function(selector, context){
    return zepto.init(selector, context)
  }

  function extend(target, source, deep) {
    for (key in source)
      if (deep && (isPlainObject(source[key]) || isArray(source[key]))) {
        if (isPlainObject(source[key]) && !isPlainObject(target[key]))
          target[key] = {}
        if (isArray(source[key]) && !isArray(target[key]))
          target[key] = []
        extend(target[key], source[key], deep)
      }
      else if (source[key] !== undefined) target[key] = source[key]
  }

  // Copy all but undefined properties from one or more
  // objects to the `target` object.
  $.extend = function(target){
    var deep, args = slice.call(arguments, 1)
    if (typeof target == 'boolean') {
      deep = target
      target = args.shift()
    }
    args.forEach(function(arg){ extend(target, arg, deep) })
    return target
  }

  // `$.zepto.qsa` is Zepto's CSS selector implementation which
  // uses `document.querySelectorAll` and optimizes for some special cases, like `#id`.
  // This method can be overriden in plugins.
  zepto.qsa = function(element, selector){
    var found
    return (isDocument(element) && idSelectorRE.test(selector)) ?
      ( (found = element.getElementById(RegExp.$1)) ? [found] : [] ) :
      (element.nodeType !== 1 && element.nodeType !== 9) ? [] :
      slice.call(
        classSelectorRE.test(selector) ? element.getElementsByClassName(RegExp.$1) :
        tagSelectorRE.test(selector) ? element.getElementsByTagName(selector) :
        element.querySelectorAll(selector)
      )
  }

  function filtered(nodes, selector) {
    return selector === undefined ? $(nodes) : $(nodes).filter(selector)
  }

  $.contains = function(parent, node) {
    return parent !== node && parent.contains(node)
  }

  function funcArg(context, arg, idx, payload) {
    return isFunction(arg) ? arg.call(context, idx, payload) : arg
  }

  function setAttribute(node, name, value) {
    value == null ? node.removeAttribute(name) : node.setAttribute(name, value)
  }

  // access className property while respecting SVGAnimatedString
  function className(node, value){
    var klass = node.className,
        svg   = klass && klass.baseVal !== undefined

    if (value === undefined) return svg ? klass.baseVal : klass
    svg ? (klass.baseVal = value) : (node.className = value)
  }

  // "true"  => true
  // "false" => false
  // "null"  => null
  // "42"    => 42
  // "42.5"  => 42.5
  // JSON    => parse if valid
  // String  => self
  function deserializeValue(value) {
    var num
    try {
      return value ?
        value == "true" ||
        ( value == "false" ? false :
          value == "null" ? null :
          !isNaN(num = Number(value)) ? num :
          /^[\[\{]/.test(value) ? $.parseJSON(value) :
          value )
        : value
    } catch(e) {
      return value
    }
  }

  $.type = type
  $.isFunction = isFunction
  $.isWindow = isWindow
  $.isArray = isArray
  $.isPlainObject = isPlainObject

  $.isEmptyObject = function(obj) {
    var name
    for (name in obj) return false
    return true
  }

  $.inArray = function(elem, array, i){
    return emptyArray.indexOf.call(array, elem, i)
  }

  $.camelCase = camelize
  $.trim = function(str) { return str.trim() }

  // plugin compatibility
  $.uuid = 0
  $.support = { }
  $.expr = { }

  $.map = function(elements, callback){
    var value, values = [], i, key
    if (likeArray(elements))
      for (i = 0; i < elements.length; i++) {
        value = callback(elements[i], i)
        if (value != null) values.push(value)
      }
    else
      for (key in elements) {
        value = callback(elements[key], key)
        if (value != null) values.push(value)
      }
    return flatten(values)
  }

  $.each = function(elements, callback){
    var i, key
    if (likeArray(elements)) {
      for (i = 0; i < elements.length; i++)
        if (callback.call(elements[i], i, elements[i]) === false) return elements
    } else {
      for (key in elements)
        if (callback.call(elements[key], key, elements[key]) === false) return elements
    }

    return elements
  }

  $.grep = function(elements, callback){
    return filter.call(elements, callback)
  }

  if (window.JSON) $.parseJSON = JSON.parse

  // Populate the class2type map
  $.each("Boolean Number String Function Array Date RegExp Object Error".split(" "), function(i, name) {
    class2type[ "[object " + name + "]" ] = name.toLowerCase()
  })

  // Define methods that will be available on all
  // Zepto collections
  $.fn = {
    // Because a collection acts like an array
    // copy over these useful array functions.
    forEach: emptyArray.forEach,
    reduce: emptyArray.reduce,
    push: emptyArray.push,
    sort: emptyArray.sort,
    indexOf: emptyArray.indexOf,
    concat: emptyArray.concat,

    // `map` and `slice` in the jQuery API work differently
    // from their array counterparts
    map: function(fn){
      return $($.map(this, function(el, i){ return fn.call(el, i, el) }))
    },
    slice: function(){
      return $(slice.apply(this, arguments))
    },

    ready: function(callback){
      if (readyRE.test(document.readyState)) callback($)
      else document.addEventListener('DOMContentLoaded', function(){ callback($) }, false)
      return this
    },
    get: function(idx){
      return idx === undefined ? slice.call(this) : this[idx >= 0 ? idx : idx + this.length]
    },
    toArray: function(){ return this.get() },
    size: function(){
      return this.length
    },
    remove: function(){
      return this.each(function(){
        if (this.parentNode != null)
          this.parentNode.removeChild(this)
      })
    },
    each: function(callback){
      emptyArray.every.call(this, function(el, idx){
        return callback.call(el, idx, el) !== false
      })
      return this
    },
    filter: function(selector){
      if (isFunction(selector)) return this.not(this.not(selector))
      return $(filter.call(this, function(element){
        return zepto.matches(element, selector)
      }))
    },
    add: function(selector,context){
      return $(uniq(this.concat($(selector,context))))
    },
    is: function(selector){
      return this.length > 0 && zepto.matches(this[0], selector)
    },
    not: function(selector){
      var nodes=[]
      if (isFunction(selector) && selector.call !== undefined)
        this.each(function(idx){
          if (!selector.call(this,idx)) nodes.push(this)
        })
      else {
        var excludes = typeof selector == 'string' ? this.filter(selector) :
          (likeArray(selector) && isFunction(selector.item)) ? slice.call(selector) : $(selector)
        this.forEach(function(el){
          if (excludes.indexOf(el) < 0) nodes.push(el)
        })
      }
      return $(nodes)
    },
    has: function(selector){
      return this.filter(function(){
        return isObject(selector) ?
          $.contains(this, selector) :
          $(this).find(selector).size()
      })
    },
    eq: function(idx){
      return idx === -1 ? this.slice(idx) : this.slice(idx, + idx + 1)
    },
    first: function(){
      var el = this[0]
      return el && !isObject(el) ? el : $(el)
    },
    last: function(){
      var el = this[this.length - 1]
      return el && !isObject(el) ? el : $(el)
    },
    find: function(selector){
      var result, $this = this
      if (typeof selector == 'object')
        result = $(selector).filter(function(){
          var node = this
          return emptyArray.some.call($this, function(parent){
            return $.contains(parent, node)
          })
        })
      else if (this.length == 1) result = $(zepto.qsa(this[0], selector))
      else result = this.map(function(){ return zepto.qsa(this, selector) })
      return result
    },
    closest: function(selector, context){
      var node = this[0], collection = false
      if (typeof selector == 'object') collection = $(selector)
      while (node && !(collection ? collection.indexOf(node) >= 0 : zepto.matches(node, selector)))
        node = node !== context && !isDocument(node) && node.parentNode
      return $(node)
    },
    parents: function(selector){
      var ancestors = [], nodes = this
      while (nodes.length > 0)
        nodes = $.map(nodes, function(node){
          if ((node = node.parentNode) && !isDocument(node) && ancestors.indexOf(node) < 0) {
            ancestors.push(node)
            return node
          }
        })
      return filtered(ancestors, selector)
    },
    parent: function(selector){
      return filtered(uniq(this.pluck('parentNode')), selector)
    },
    children: function(selector){
      return filtered(this.map(function(){ return children(this) }), selector)
    },
    contents: function() {
      return this.map(function() { return slice.call(this.childNodes) })
    },
    siblings: function(selector){
      return filtered(this.map(function(i, el){
        return filter.call(children(el.parentNode), function(child){ return child!==el })
      }), selector)
    },
    empty: function(){
      return this.each(function(){ this.innerHTML = '' })
    },
    // `pluck` is borrowed from Prototype.js
    pluck: function(property){
      return $.map(this, function(el){ return el[property] })
    },
    show: function(){
      return this.each(function(){
        this.style.display == "none" && (this.style.display = null)
        if (getComputedStyle(this, '').getPropertyValue("display") == "none")
          this.style.display = defaultDisplay(this.nodeName)
      })
    },
    replaceWith: function(newContent){
      return this.before(newContent).remove()
    },
    wrap: function(structure){
      var func = isFunction(structure)
      if (this[0] && !func)
        var dom   = $(structure).get(0),
            clone = dom.parentNode || this.length > 1

      return this.each(function(index){
        $(this).wrapAll(
          func ? structure.call(this, index) :
            clone ? dom.cloneNode(true) : dom
        )
      })
    },
    wrapAll: function(structure){
      if (this[0]) {
        $(this[0]).before(structure = $(structure))
        var children
        // drill down to the inmost element
        while ((children = structure.children()).length) structure = children.first()
        $(structure).append(this)
      }
      return this
    },
    wrapInner: function(structure){
      var func = isFunction(structure)
      return this.each(function(index){
        var self = $(this), contents = self.contents(),
            dom  = func ? structure.call(this, index) : structure
        contents.length ? contents.wrapAll(dom) : self.append(dom)
      })
    },
    unwrap: function(){
      this.parent().each(function(){
        $(this).replaceWith($(this).children())
      })
      return this
    },
    clone: function(){
      return this.map(function(){ return this.cloneNode(true) })
    },
    hide: function(){
      return this.css("display", "none")
    },
    toggle: function(setting){
      return this.each(function(){
        var el = $(this)
        ;(setting === undefined ? el.css("display") == "none" : setting) ? el.show() : el.hide()
      })
    },
    prev: function(selector){ return $(this.pluck('previousElementSibling')).filter(selector || '*') },
    next: function(selector){ return $(this.pluck('nextElementSibling')).filter(selector || '*') },
    html: function(html){
      return html === undefined ?
        (this.length > 0 ? this[0].innerHTML : null) :
        this.each(function(idx){
          var originHtml = this.innerHTML
          $(this).empty().append( funcArg(this, html, idx, originHtml) )
        })
    },
    text: function(text){
      return text === undefined ?
        (this.length > 0 ? this[0].textContent : null) :
        this.each(function(){ this.textContent = text })
    },
    attr: function(name, value){
      var result
      return (typeof name == 'string' && value === undefined) ?
        (this.length == 0 || this[0].nodeType !== 1 ? undefined :
          (name == 'value' && this[0].nodeName == 'INPUT') ? this.val() :
          (!(result = this[0].getAttribute(name)) && name in this[0]) ? this[0][name] : result
        ) :
        this.each(function(idx){
          if (this.nodeType !== 1) return
          if (isObject(name)) for (key in name) setAttribute(this, key, name[key])
          else setAttribute(this, name, funcArg(this, value, idx, this.getAttribute(name)))
        })
    },
    removeAttr: function(name){
      return this.each(function(){ this.nodeType === 1 && setAttribute(this, name) })
    },
    prop: function(name, value){
      return (value === undefined) ?
        (this[0] && this[0][name]) :
        this.each(function(idx){
          this[name] = funcArg(this, value, idx, this[name])
        })
    },
    data: function(name, value){
      var data = this.attr('data-' + dasherize(name), value)
      return data !== null ? deserializeValue(data) : undefined
    },
    val: function(value){
      return (value === undefined) ?
        (this[0] && (this[0].multiple ?
           $(this[0]).find('option').filter(function(o){ return this.selected }).pluck('value') :
           this[0].value)
        ) :
        this.each(function(idx){
          this.value = funcArg(this, value, idx, this.value)
        })
    },
    offset: function(coordinates){
      if (coordinates) return this.each(function(index){
        var $this = $(this),
            coords = funcArg(this, coordinates, index, $this.offset()),
            parentOffset = $this.offsetParent().offset(),
            props = {
              top:  coords.top  - parentOffset.top,
              left: coords.left - parentOffset.left
            }

        if ($this.css('position') == 'static') props['position'] = 'relative'
        $this.css(props)
      })
      if (this.length==0) return null
      var obj = this[0].getBoundingClientRect()
      return {
        left: obj.left + window.pageXOffset,
        top: obj.top + window.pageYOffset,
        width: Math.round(obj.width),
        height: Math.round(obj.height)
      }
    },
    css: function(property, value){
      if (arguments.length < 2 && typeof property == 'string')
        return this[0] && (this[0].style[camelize(property)] || getComputedStyle(this[0], '').getPropertyValue(property))

      var css = ''
      if (type(property) == 'string') {
        if (!value && value !== 0)
          this.each(function(){ this.style.removeProperty(dasherize(property)) })
        else
          css = dasherize(property) + ":" + maybeAddPx(property, value)
      } else {
        for (key in property)
          if (!property[key] && property[key] !== 0)
            this.each(function(){ this.style.removeProperty(dasherize(key)) })
          else
            css += dasherize(key) + ':' + maybeAddPx(key, property[key]) + ';'
      }

      return this.each(function(){ this.style.cssText += ';' + css })
    },
    index: function(element){
      return element ? this.indexOf($(element)[0]) : this.parent().children().indexOf(this[0])
    },
    hasClass: function(name){
      return emptyArray.some.call(this, function(el){
        return this.test(className(el))
      }, classRE(name))
    },
    addClass: function(name){
      return this.each(function(idx){
        classList = []
        var cls = className(this), newName = funcArg(this, name, idx, cls)
        newName.split(/\s+/g).forEach(function(klass){
          if (!$(this).hasClass(klass)) classList.push(klass)
        }, this)
        classList.length && className(this, cls + (cls ? " " : "") + classList.join(" "))
      })
    },
    removeClass: function(name){
      return this.each(function(idx){
        if (name === undefined) return className(this, '')
        classList = className(this)
        funcArg(this, name, idx, classList).split(/\s+/g).forEach(function(klass){
          classList = classList.replace(classRE(klass), " ")
        })
        className(this, classList.trim())
      })
    },
    toggleClass: function(name, when){
      return this.each(function(idx){
        var $this = $(this), names = funcArg(this, name, idx, className(this))
        names.split(/\s+/g).forEach(function(klass){
          (when === undefined ? !$this.hasClass(klass) : when) ?
            $this.addClass(klass) : $this.removeClass(klass)
        })
      })
    },
    scrollTop: function(){
      if (!this.length) return
      return ('scrollTop' in this[0]) ? this[0].scrollTop : this[0].scrollY
    },
    position: function() {
      if (!this.length) return

      var elem = this[0],
        // Get *real* offsetParent
        offsetParent = this.offsetParent(),
        // Get correct offsets
        offset       = this.offset(),
        parentOffset = rootNodeRE.test(offsetParent[0].nodeName) ? { top: 0, left: 0 } : offsetParent.offset()

      // Subtract element margins
      // note: when an element has margin: auto the offsetLeft and marginLeft
      // are the same in Safari causing offset.left to incorrectly be 0
      offset.top  -= parseFloat( $(elem).css('margin-top') ) || 0
      offset.left -= parseFloat( $(elem).css('margin-left') ) || 0

      // Add offsetParent borders
      parentOffset.top  += parseFloat( $(offsetParent[0]).css('border-top-width') ) || 0
      parentOffset.left += parseFloat( $(offsetParent[0]).css('border-left-width') ) || 0

      // Subtract the two offsets
      return {
        top:  offset.top  - parentOffset.top,
        left: offset.left - parentOffset.left
      }
    },
    offsetParent: function() {
      return this.map(function(){
        var parent = this.offsetParent || document.body
        while (parent && !rootNodeRE.test(parent.nodeName) && $(parent).css("position") == "static")
          parent = parent.offsetParent
        return parent
      })
    }
  }

  // for now
  $.fn.detach = $.fn.remove

  // Generate the `width` and `height` functions
  ;['width', 'height'].forEach(function(dimension){
    $.fn[dimension] = function(value){
      var offset, el = this[0],
        Dimension = dimension.replace(/./, function(m){ return m[0].toUpperCase() })
      if (value === undefined) return isWindow(el) ? el['inner' + Dimension] :
        isDocument(el) ? el.documentElement['offset' + Dimension] :
        (offset = this.offset()) && offset[dimension]
      else return this.each(function(idx){
        el = $(this)
        el.css(dimension, funcArg(this, value, idx, el[dimension]()))
      })
    }
  })

  function traverseNode(node, fun) {
    fun(node)
    for (var key in node.childNodes) traverseNode(node.childNodes[key], fun)
  }

  // Generate the `after`, `prepend`, `before`, `append`,
  // `insertAfter`, `insertBefore`, `appendTo`, and `prependTo` methods.
  adjacencyOperators.forEach(function(operator, operatorIndex) {
    var inside = operatorIndex % 2 //=> prepend, append

    $.fn[operator] = function(){
      // arguments can be nodes, arrays of nodes, Zepto objects and HTML strings
      var argType, nodes = $.map(arguments, function(arg) {
            argType = type(arg)
            return argType == "object" || argType == "array" || arg == null ?
              arg : zepto.fragment(arg)
          }),
          parent, copyByClone = this.length > 1
      if (nodes.length < 1) return this

      return this.each(function(_, target){
        parent = inside ? target : target.parentNode

        // convert all methods to a "before" operation
        target = operatorIndex == 0 ? target.nextSibling :
                 operatorIndex == 1 ? target.firstChild :
                 operatorIndex == 2 ? target :
                 null

        nodes.forEach(function(node){
          if (copyByClone) node = node.cloneNode(true)
          else if (!parent) return $(node).remove()

          traverseNode(parent.insertBefore(node, target), function(el){
            if (el.nodeName != null && el.nodeName.toUpperCase() === 'SCRIPT' &&
               (!el.type || el.type === 'text/javascript') && !el.src)
              window['eval'].call(window, el.innerHTML)
          })
        })
      })
    }

    // after    => insertAfter
    // prepend  => prependTo
    // before   => insertBefore
    // append   => appendTo
    $.fn[inside ? operator+'To' : 'insert'+(operatorIndex ? 'Before' : 'After')] = function(html){
      $(html)[operator](this)
      return this
    }
  })

  zepto.Z.prototype = $.fn

  // Export internal API functions in the `$.zepto` namespace
  zepto.uniq = uniq
  zepto.deserializeValue = deserializeValue
  $.zepto = zepto

  return $
})()

window.Zepto = Zepto
'$' in window || (window.$ = Zepto)

;(function($){
  function detect(ua){
    var os = this.os = {}, browser = this.browser = {},
      webkit = ua.match(/WebKit\/([\d.]+)/),
      android = ua.match(/(Android)\s+([\d.]+)/),
      ipad = ua.match(/(iPad).*OS\s([\d_]+)/),
      iphone = !ipad && ua.match(/(iPhone\sOS)\s([\d_]+)/),
      webos = ua.match(/(webOS|hpwOS)[\s\/]([\d.]+)/),
      touchpad = webos && ua.match(/TouchPad/),
      kindle = ua.match(/Kindle\/([\d.]+)/),
      silk = ua.match(/Silk\/([\d._]+)/),
      blackberry = ua.match(/(BlackBerry).*Version\/([\d.]+)/),
      bb10 = ua.match(/(BB10).*Version\/([\d.]+)/),
      rimtabletos = ua.match(/(RIM\sTablet\sOS)\s([\d.]+)/),
      playbook = ua.match(/PlayBook/),
      chrome = ua.match(/Chrome\/([\d.]+)/) || ua.match(/CriOS\/([\d.]+)/),
      firefox = ua.match(/Firefox\/([\d.]+)/)

    // Todo: clean this up with a better OS/browser seperation:
    // - discern (more) between multiple browsers on android
    // - decide if kindle fire in silk mode is android or not
    // - Firefox on Android doesn't specify the Android version
    // - possibly devide in os, device and browser hashes

    if (browser.webkit = !!webkit) browser.version = webkit[1]

    if (android) os.android = true, os.version = android[2]
    if (iphone) os.ios = os.iphone = true, os.version = iphone[2].replace(/_/g, '.')
    if (ipad) os.ios = os.ipad = true, os.version = ipad[2].replace(/_/g, '.')
    if (webos) os.webos = true, os.version = webos[2]
    if (touchpad) os.touchpad = true
    if (blackberry) os.blackberry = true, os.version = blackberry[2]
    if (bb10) os.bb10 = true, os.version = bb10[2]
    if (rimtabletos) os.rimtabletos = true, os.version = rimtabletos[2]
    if (playbook) browser.playbook = true
    if (kindle) os.kindle = true, os.version = kindle[1]
    if (silk) browser.silk = true, browser.version = silk[1]
    if (!silk && os.android && ua.match(/Kindle Fire/)) browser.silk = true
    if (chrome) browser.chrome = true, browser.version = chrome[1]
    if (firefox) browser.firefox = true, browser.version = firefox[1]

    os.tablet = !!(ipad || playbook || (android && !ua.match(/Mobile/)) || (firefox && ua.match(/Tablet/)))
    os.phone  = !!(!os.tablet && (android || iphone || webos || blackberry || bb10 ||
      (chrome && ua.match(/Android/)) || (chrome && ua.match(/CriOS\/([\d.]+)/)) || (firefox && ua.match(/Mobile/))))
  }

  detect.call($, navigator.userAgent)
  // make available to unit tests
  $.__detect = detect

})(Zepto)

;(function($){
  var $$ = $.zepto.qsa, handlers = {}, _zid = 1, specialEvents={},
      hover = { mouseenter: 'mouseover', mouseleave: 'mouseout' }

  specialEvents.click = specialEvents.mousedown = specialEvents.mouseup = specialEvents.mousemove = 'MouseEvents'

  function zid(element) {
    return element._zid || (element._zid = _zid++)
  }
  function findHandlers(element, event, fn, selector) {
    event = parse(event)
    if (event.ns) var matcher = matcherFor(event.ns)
    return (handlers[zid(element)] || []).filter(function(handler) {
      return handler
        && (!event.e  || handler.e == event.e)
        && (!event.ns || matcher.test(handler.ns))
        && (!fn       || zid(handler.fn) === zid(fn))
        && (!selector || handler.sel == selector)
    })
  }
  function parse(event) {
    var parts = ('' + event).split('.')
    return {e: parts[0], ns: parts.slice(1).sort().join(' ')}
  }
  function matcherFor(ns) {
    return new RegExp('(?:^| )' + ns.replace(' ', ' .* ?') + '(?: |$)')
  }

  function eachEvent(events, fn, iterator){
    if ($.type(events) != "string") $.each(events, iterator)
    else events.split(/\s/).forEach(function(type){ iterator(type, fn) })
  }

  function eventCapture(handler, captureSetting) {
    return handler.del &&
      (handler.e == 'focus' || handler.e == 'blur') ||
      !!captureSetting
  }

  function realEvent(type) {
    return hover[type] || type
  }

  function add(element, events, fn, selector, getDelegate, capture){
    var id = zid(element), set = (handlers[id] || (handlers[id] = []))
    eachEvent(events, fn, function(event, fn){
      var handler   = parse(event)
      handler.fn    = fn
      handler.sel   = selector
      // emulate mouseenter, mouseleave
      if (handler.e in hover) fn = function(e){
        var related = e.relatedTarget
        if (!related || (related !== this && !$.contains(this, related)))
          return handler.fn.apply(this, arguments)
      }
      handler.del   = getDelegate && getDelegate(fn, event)
      var callback  = handler.del || fn
      handler.proxy = function (e) {
        var result = callback.apply(element, [e].concat(e.data))
        if (result === false) e.preventDefault(), e.stopPropagation()
        return result
      }
      handler.i = set.length
      set.push(handler)
      element.addEventListener(realEvent(handler.e), handler.proxy, eventCapture(handler, capture))
    })
  }
  function remove(element, events, fn, selector, capture){
    var id = zid(element)
    eachEvent(events || '', fn, function(event, fn){
      findHandlers(element, event, fn, selector).forEach(function(handler){
        delete handlers[id][handler.i]
        element.removeEventListener(realEvent(handler.e), handler.proxy, eventCapture(handler, capture))
      })
    })
  }

  $.event = { add: add, remove: remove }

  $.proxy = function(fn, context) {
    if ($.isFunction(fn)) {
      var proxyFn = function(){ return fn.apply(context, arguments) }
      proxyFn._zid = zid(fn)
      return proxyFn
    } else if (typeof context == 'string') {
      return $.proxy(fn[context], fn)
    } else {
      throw new TypeError("expected function")
    }
  }

  $.fn.bind = function(event, callback){
    return this.each(function(){
      add(this, event, callback)
    })
  }
  $.fn.unbind = function(event, callback){
    return this.each(function(){
      remove(this, event, callback)
    })
  }
  $.fn.one = function(event, callback){
    return this.each(function(i, element){
      add(this, event, callback, null, function(fn, type){
        return function(){
          var result = fn.apply(element, arguments)
          remove(element, type, fn)
          return result
        }
      })
    })
  }

  var returnTrue = function(){return true},
      returnFalse = function(){return false},
      ignoreProperties = /^([A-Z]|layer[XY]$)/,
      eventMethods = {
        preventDefault: 'isDefaultPrevented',
        stopImmediatePropagation: 'isImmediatePropagationStopped',
        stopPropagation: 'isPropagationStopped'
      }
  function createProxy(event) {
    var key, proxy = { originalEvent: event }
    for (key in event)
      if (!ignoreProperties.test(key) && event[key] !== undefined) proxy[key] = event[key]

    $.each(eventMethods, function(name, predicate) {
      proxy[name] = function(){
        this[predicate] = returnTrue
        return event[name].apply(event, arguments)
      }
      proxy[predicate] = returnFalse
    })
    return proxy
  }

  // emulates the 'defaultPrevented' property for browsers that have none
  function fix(event) {
    if (!('defaultPrevented' in event)) {
      event.defaultPrevented = false
      var prevent = event.preventDefault
      event.preventDefault = function() {
        this.defaultPrevented = true
        prevent.call(this)
      }
    }
  }

  $.fn.delegate = function(selector, event, callback){
    return this.each(function(i, element){
      add(element, event, callback, selector, function(fn){
        return function(e){
          var evt, match = $(e.target).closest(selector, element).get(0)
          if (match) {
            evt = $.extend(createProxy(e), {currentTarget: match, liveFired: element})
            return fn.apply(match, [evt].concat([].slice.call(arguments, 1)))
          }
        }
      })
    })
  }
  $.fn.undelegate = function(selector, event, callback){
    return this.each(function(){
      remove(this, event, callback, selector)
    })
  }

  $.fn.live = function(event, callback){
    $(document.body).delegate(this.selector, event, callback)
    return this
  }
  $.fn.die = function(event, callback){
    $(document.body).undelegate(this.selector, event, callback)
    return this
  }

  $.fn.on = function(event, selector, callback){
    return !selector || $.isFunction(selector) ?
      this.bind(event, selector || callback) : this.delegate(selector, event, callback)
  }
  $.fn.off = function(event, selector, callback){
    return !selector || $.isFunction(selector) ?
      this.unbind(event, selector || callback) : this.undelegate(selector, event, callback)
  }

  $.fn.trigger = function(event, data){
    if (typeof event == 'string' || $.isPlainObject(event)) event = $.Event(event)
    fix(event)
    event.data = data
    return this.each(function(){
      // items in the collection might not be DOM elements
      // (todo: possibly support events on plain old objects)
      if('dispatchEvent' in this) this.dispatchEvent(event)
    })
  }

  // triggers event handlers on current element just as if an event occurred,
  // doesn't trigger an actual event, doesn't bubble
  $.fn.triggerHandler = function(event, data){
    var e, result
    this.each(function(i, element){
      e = createProxy(typeof event == 'string' ? $.Event(event) : event)
      e.data = data
      e.target = element
      $.each(findHandlers(element, event.type || event), function(i, handler){
        result = handler.proxy(e)
        if (e.isImmediatePropagationStopped()) return false
      })
    })
    return result
  }

  // shortcut methods for `.bind(event, fn)` for each event type
  ;('focusin focusout load resize scroll unload click dblclick '+
  'mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave '+
  'change select keydown keypress keyup error').split(' ').forEach(function(event) {
    $.fn[event] = function(callback) {
      return callback ?
        this.bind(event, callback) :
        this.trigger(event)
    }
  })

  ;['focus', 'blur'].forEach(function(name) {
    $.fn[name] = function(callback) {
      if (callback) this.bind(name, callback)
      else this.each(function(){
        try { this[name]() }
        catch(e) {}
      })
      return this
    }
  })

  $.Event = function(type, props) {
    if (typeof type != 'string') props = type, type = props.type
    var event = document.createEvent(specialEvents[type] || 'Events'), bubbles = true
    if (props) for (var name in props) (name == 'bubbles') ? (bubbles = !!props[name]) : (event[name] = props[name])
    event.initEvent(type, bubbles, true, null, null, null, null, null, null, null, null, null, null, null, null)
    event.isDefaultPrevented = function(){ return this.defaultPrevented }
    return event
  }

})(Zepto)

;(function($){
  var jsonpID = 0,
      document = window.document,
      key,
      name,
      rscript = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      scriptTypeRE = /^(?:text|application)\/javascript/i,
      xmlTypeRE = /^(?:text|application)\/xml/i,
      jsonType = 'application/json',
      htmlType = 'text/html',
      blankRE = /^\s*$/

  // trigger a custom event and return false if it was cancelled
  function triggerAndReturn(context, eventName, data) {
    var event = $.Event(eventName)
    $(context).trigger(event, data)
    return !event.defaultPrevented
  }

  // trigger an Ajax "global" event
  function triggerGlobal(settings, context, eventName, data) {
    if (settings.global) return triggerAndReturn(context || document, eventName, data)
  }

  // Number of active Ajax requests
  $.active = 0

  function ajaxStart(settings) {
    if (settings.global && $.active++ === 0) triggerGlobal(settings, null, 'ajaxStart')
  }
  function ajaxStop(settings) {
    if (settings.global && !(--$.active)) triggerGlobal(settings, null, 'ajaxStop')
  }

  // triggers an extra global event "ajaxBeforeSend" that's like "ajaxSend" but cancelable
  function ajaxBeforeSend(xhr, settings) {
    var context = settings.context
    if (settings.beforeSend.call(context, xhr, settings) === false ||
        triggerGlobal(settings, context, 'ajaxBeforeSend', [xhr, settings]) === false)
      return false

    triggerGlobal(settings, context, 'ajaxSend', [xhr, settings])
  }
  function ajaxSuccess(data, xhr, settings) {
    var context = settings.context, status = 'success'
    settings.success.call(context, data, status, xhr)
    triggerGlobal(settings, context, 'ajaxSuccess', [xhr, settings, data])
    ajaxComplete(status, xhr, settings)
  }
  // type: "timeout", "error", "abort", "parsererror"
  function ajaxError(error, type, xhr, settings) {
    var context = settings.context
    settings.error.call(context, xhr, type, error)
    triggerGlobal(settings, context, 'ajaxError', [xhr, settings, error])
    ajaxComplete(type, xhr, settings)
  }
  // status: "success", "notmodified", "error", "timeout", "abort", "parsererror"
  function ajaxComplete(status, xhr, settings) {
    var context = settings.context
    settings.complete.call(context, xhr, status)
    triggerGlobal(settings, context, 'ajaxComplete', [xhr, settings])
    ajaxStop(settings)
  }

  // Empty function, used as default callback
  function empty() {}

  $.ajaxJSONP = function(options){
    if (!('type' in options)) return $.ajax(options)

    var callbackName = 'jsonp' + (++jsonpID),
      script = document.createElement('script'),
      cleanup = function() {
        clearTimeout(abortTimeout)
        $(script).remove()
        delete window[callbackName]
      },
      abort = function(type){
        cleanup()
        // In case of manual abort or timeout, keep an empty function as callback
        // so that the SCRIPT tag that eventually loads won't result in an error.
        if (!type || type == 'timeout') window[callbackName] = empty
        ajaxError(null, type || 'abort', xhr, options)
      },
      xhr = { abort: abort }, abortTimeout

    if (ajaxBeforeSend(xhr, options) === false) {
      abort('abort')
      return false
    }

    window[callbackName] = function(data){
      cleanup()
      ajaxSuccess(data, xhr, options)
    }

    script.onerror = function() { abort('error') }

    script.src = options.url.replace(/=\?/, '=' + callbackName)
    $('head').append(script)

    if (options.timeout > 0) abortTimeout = setTimeout(function(){
      abort('timeout')
    }, options.timeout)

    return xhr
  }

  $.ajaxSettings = {
    // Default type of request
    type: 'GET',
    // Callback that is executed before request
    beforeSend: empty,
    // Callback that is executed if the request succeeds
    success: empty,
    // Callback that is executed the the server drops error
    error: empty,
    // Callback that is executed on request complete (both: error and success)
    complete: empty,
    // The context for the callbacks
    context: null,
    // Whether to trigger "global" Ajax events
    global: true,
    // Transport
    xhr: function () {
      return new window.XMLHttpRequest()
    },
    // MIME types mapping
    accepts: {
      script: 'text/javascript, application/javascript',
      json:   jsonType,
      xml:    'application/xml, text/xml',
      html:   htmlType,
      text:   'text/plain'
    },
    // Whether the request is to another domain
    crossDomain: false,
    // Default timeout
    timeout: 0,
    // Whether data should be serialized to string
    processData: true,
    // Whether the browser should be allowed to cache GET responses
    cache: true,
  }

  function mimeToDataType(mime) {
    if (mime) mime = mime.split(';', 2)[0]
    return mime && ( mime == htmlType ? 'html' :
      mime == jsonType ? 'json' :
      scriptTypeRE.test(mime) ? 'script' :
      xmlTypeRE.test(mime) && 'xml' ) || 'text'
  }

  function appendQuery(url, query) {
    return (url + '&' + query).replace(/[&?]{1,2}/, '?')
  }

  // serialize payload and append it to the URL for GET requests
  function serializeData(options) {
    if (options.processData && options.data && $.type(options.data) != "string")
      options.data = $.param(options.data, options.traditional)
    if (options.data && (!options.type || options.type.toUpperCase() == 'GET'))
      options.url = appendQuery(options.url, options.data)
  }

  $.ajax = function(options){
    var settings = $.extend({}, options || {})
    for (key in $.ajaxSettings) if (settings[key] === undefined) settings[key] = $.ajaxSettings[key]

    ajaxStart(settings)

    if (!settings.crossDomain) settings.crossDomain = /^([\w-]+:)?\/\/([^\/]+)/.test(settings.url) &&
      RegExp.$2 != window.location.host

    if (!settings.url) settings.url = window.location.toString()
    serializeData(settings)
    if (settings.cache === false) settings.url = appendQuery(settings.url, '_=' + Date.now())

    var dataType = settings.dataType, hasPlaceholder = /=\?/.test(settings.url)
    if (dataType == 'jsonp' || hasPlaceholder) {
      if (!hasPlaceholder) settings.url = appendQuery(settings.url, 'callback=?')
      return $.ajaxJSONP(settings)
    }

    var mime = settings.accepts[dataType],
        baseHeaders = { },
        protocol = /^([\w-]+:)\/\//.test(settings.url) ? RegExp.$1 : window.location.protocol,
        xhr = settings.xhr(), abortTimeout

    if (!settings.crossDomain) baseHeaders['X-Requested-With'] = 'XMLHttpRequest'
    if (mime) {
      baseHeaders['Accept'] = mime
      if (mime.indexOf(',') > -1) mime = mime.split(',', 2)[0]
      xhr.overrideMimeType && xhr.overrideMimeType(mime)
    }
    if (settings.contentType || (settings.contentType !== false && settings.data && settings.type.toUpperCase() != 'GET'))
      baseHeaders['Content-Type'] = (settings.contentType || 'application/x-www-form-urlencoded')
    settings.headers = $.extend(baseHeaders, settings.headers || {})

    xhr.onreadystatechange = function(){
      if (xhr.readyState == 4) {
        xhr.onreadystatechange = empty;
        clearTimeout(abortTimeout)
        var result, error = false
        if ((xhr.status >= 200 && xhr.status < 300) || xhr.status == 304 || (xhr.status == 0 && protocol == 'file:')) {
          dataType = dataType || mimeToDataType(xhr.getResponseHeader('content-type'))
          result = xhr.responseText

          try {
            // http://perfectionkills.com/global-eval-what-are-the-options/
            if (dataType == 'script')    (1,eval)(result)
            else if (dataType == 'xml')  result = xhr.responseXML
            else if (dataType == 'json') result = blankRE.test(result) ? null : $.parseJSON(result)
          } catch (e) { error = e }

          if (error) ajaxError(error, 'parsererror', xhr, settings)
          else ajaxSuccess(result, xhr, settings)
        } else {
          ajaxError(null, xhr.status ? 'error' : 'abort', xhr, settings)
        }
      }
    }

    var async = 'async' in settings ? settings.async : true
    xhr.open(settings.type, settings.url, async)

    for (name in settings.headers) xhr.setRequestHeader(name, settings.headers[name])

    if (ajaxBeforeSend(xhr, settings) === false) {
      xhr.abort()
      return false
    }

    if (settings.timeout > 0) abortTimeout = setTimeout(function(){
        xhr.onreadystatechange = empty
        xhr.abort()
        ajaxError(null, 'timeout', xhr, settings)
      }, settings.timeout)

    // avoid sending empty string (#319)
    xhr.send(settings.data ? settings.data : null)
    return xhr
  }

  // handle optional data/success arguments
  function parseArguments(url, data, success, dataType) {
    var hasData = !$.isFunction(data)
    return {
      url:      url,
      data:     hasData  ? data : undefined,
      success:  !hasData ? data : $.isFunction(success) ? success : undefined,
      dataType: hasData  ? dataType || success : success
    }
  }

  $.get = function(url, data, success, dataType){
    return $.ajax(parseArguments.apply(null, arguments))
  }

  $.post = function(url, data, success, dataType){
    var options = parseArguments.apply(null, arguments)
    options.type = 'POST'
    return $.ajax(options)
  }

  $.getJSON = function(url, data, success){
    var options = parseArguments.apply(null, arguments)
    options.dataType = 'json'
    return $.ajax(options)
  }

  $.fn.load = function(url, data, success){
    if (!this.length) return this
    var self = this, parts = url.split(/\s/), selector,
        options = parseArguments(url, data, success),
        callback = options.success
    if (parts.length > 1) options.url = parts[0], selector = parts[1]
    options.success = function(response){
      self.html(selector ?
        $('<div>').html(response.replace(rscript, "")).find(selector)
        : response)
      callback && callback.apply(self, arguments)
    }
    $.ajax(options)
    return this
  }

  var escape = encodeURIComponent

  function serialize(params, obj, traditional, scope){
    var type, array = $.isArray(obj)
    $.each(obj, function(key, value) {
      type = $.type(value)
      if (scope) key = traditional ? scope : scope + '[' + (array ? '' : key) + ']'
      // handle data in serializeArray() format
      if (!scope && array) params.add(value.name, value.value)
      // recurse into nested objects
      else if (type == "array" || (!traditional && type == "object"))
        serialize(params, value, traditional, key)
      else params.add(key, value)
    })
  }

  $.param = function(obj, traditional){
    var params = []
    params.add = function(k, v){ this.push(escape(k) + '=' + escape(v)) }
    serialize(params, obj, traditional)
    return params.join('&').replace(/%20/g, '+')
  }
})(Zepto)

;(function ($) {
  $.fn.serializeArray = function () {
    var result = [], el
    $( Array.prototype.slice.call(this.get(0).elements) ).each(function () {
      el = $(this)
      var type = el.attr('type')
      if (this.nodeName.toLowerCase() != 'fieldset' &&
        !this.disabled && type != 'submit' && type != 'reset' && type != 'button' &&
        ((type != 'radio' && type != 'checkbox') || this.checked))
        result.push({
          name: el.attr('name'),
          value: el.val()
        })
    })
    return result
  }

  $.fn.serialize = function () {
    var result = []
    this.serializeArray().forEach(function (elm) {
      result.push( encodeURIComponent(elm.name) + '=' + encodeURIComponent(elm.value) )
    })
    return result.join('&')
  }

  $.fn.submit = function (callback) {
    if (callback) this.bind('submit', callback)
    else if (this.length) {
      var event = $.Event('submit')
      this.eq(0).trigger(event)
      if (!event.defaultPrevented) this.get(0).submit()
    }
    return this
  }

})(Zepto)

;(function($, undefined){
  var prefix = '', eventPrefix, endEventName, endAnimationName,
    vendors = { Webkit: 'webkit', Moz: '', O: 'o', ms: 'MS' },
    document = window.document, testEl = document.createElement('div'),
    supportedTransforms = /^((translate|rotate|scale)(X|Y|Z|3d)?|matrix(3d)?|perspective|skew(X|Y)?)$/i,
    transform,
    transitionProperty, transitionDuration, transitionTiming,
    animationName, animationDuration, animationTiming,
    cssReset = {}

  function dasherize(str) { return downcase(str.replace(/([a-z])([A-Z])/, '$1-$2')) }
  function downcase(str) { return str.toLowerCase() }
  function normalizeEvent(name) { return eventPrefix ? eventPrefix + name : downcase(name) }

  $.each(vendors, function(vendor, event){
    if (testEl.style[vendor + 'TransitionProperty'] !== undefined) {
      prefix = '-' + downcase(vendor) + '-'
      eventPrefix = event
      return false
    }
  })

  transform = prefix + 'transform'
  cssReset[transitionProperty = prefix + 'transition-property'] =
  cssReset[transitionDuration = prefix + 'transition-duration'] =
  cssReset[transitionTiming   = prefix + 'transition-timing-function'] =
  cssReset[animationName      = prefix + 'animation-name'] =
  cssReset[animationDuration  = prefix + 'animation-duration'] =
  cssReset[animationTiming    = prefix + 'animation-timing-function'] = ''

  $.fx = {
    off: (eventPrefix === undefined && testEl.style.transitionProperty === undefined),
    speeds: { _default: 400, fast: 200, slow: 600 },
    cssPrefix: prefix,
    transitionEnd: normalizeEvent('TransitionEnd'),
    animationEnd: normalizeEvent('AnimationEnd')
  }

  $.fn.animate = function(properties, duration, ease, callback){
    if ($.isPlainObject(duration))
      ease = duration.easing, callback = duration.complete, duration = duration.duration
    if (duration) duration = (typeof duration == 'number' ? duration :
                    ($.fx.speeds[duration] || $.fx.speeds._default)) / 1000
    return this.anim(properties, duration, ease, callback)
  }

  $.fn.anim = function(properties, duration, ease, callback){
    var key, cssValues = {}, cssProperties, transforms = '',
        that = this, wrappedCallback, endEvent = $.fx.transitionEnd

    if (duration === undefined) duration = 0.4
    if ($.fx.off) duration = 0

    if (typeof properties == 'string') {
      // keyframe animation
      cssValues[animationName] = properties
      cssValues[animationDuration] = duration + 's'
      cssValues[animationTiming] = (ease || 'linear')
      endEvent = $.fx.animationEnd
    } else {
      cssProperties = []
      // CSS transitions
      for (key in properties)
        if (supportedTransforms.test(key)) transforms += key + '(' + properties[key] + ') '
        else cssValues[key] = properties[key], cssProperties.push(dasherize(key))

      if (transforms) cssValues[transform] = transforms, cssProperties.push(transform)
      if (duration > 0 && typeof properties === 'object') {
        cssValues[transitionProperty] = cssProperties.join(', ')
        cssValues[transitionDuration] = duration + 's'
        cssValues[transitionTiming] = (ease || 'linear')
      }
    }

    wrappedCallback = function(event){
      if (typeof event !== 'undefined') {
        if (event.target !== event.currentTarget) return // makes sure the event didn't bubble from "below"
        $(event.target).unbind(endEvent, wrappedCallback)
      }
      $(this).css(cssReset)
      callback && callback.call(this)
    }
    if (duration > 0) this.bind(endEvent, wrappedCallback)

    // trigger page reflow so new elements can animate
    this.size() && this.get(0).clientLeft

    this.css(cssValues)

    if (duration <= 0) setTimeout(function() {
      that.each(function(){ wrappedCallback.call(this) })
    }, 0)

    return this
  }

  testEl = null
})(Zepto);


/*!
 * artTemplate - Template Engine
 * https://github.com/aui/artTemplate
 * Released under the MIT, BSD, and GPL Licenses
 */


/**
 * 模板引擎路由函数
 * 若第二个参数类型为 Object 则执行 render 方法, 否则 compile 方法
 * @name    template
 * @param   {String}            模板ID (可选)
 * @param   {Object, String}    数据或者模板字符串
 * @return  {String, Function}  渲染好的HTML字符串或者渲染方法
 */
var template = function (id, content) {
    return template[
        typeof content === 'object' ? 'render' : 'compile'
        ].apply(template, arguments);
};




(function (exports, global) {


    'use strict';
    exports.version = '2.0.1';
    exports.openTag = '<%';     // 设置逻辑语法开始标签
    exports.closeTag = '%>';    // 设置逻辑语法结束标签
    exports.isEscape = true;    // HTML字符编码输出开关
    exports.isCompress = false; // 剔除渲染后HTML多余的空白开关
    exports.parser = null;      // 自定义语法插件接口



    /**
     * 渲染模板
     * @name    template.render
     * @param   {String}    模板ID
     * @param   {Object}    数据
     * @return  {String}    渲染好的HTML字符串
     */
    exports.render = function (id, data) {

        var cache = _getCache(id);

        if (cache === undefined) {

            return _debug({
                id: id,
                name: 'Render Error',
                message: 'No Template'
            });

        }

        return cache(data);
    };



    /**
     * 编译模板
     * 2012-6-6:
     * define 方法名改为 compile,
     * 与 Node Express 保持一致,
     * 感谢 TooBug 提供帮助!
     * @name    template.compile
     * @param   {String}    模板ID (可选)
     * @param   {String}    模板字符串
     * @return  {Function}  渲染方法
     */
    exports.compile = function (id, source) {

        var params = arguments;
        var isDebug = params[2];
        var anonymous = 'anonymous';

        if (typeof source !== 'string') {
            isDebug = params[1];
            source = params[0];
            id = anonymous;
        }


        try {

            var Render = _compile(source, isDebug);

        } catch (e) {

            e.id = id || source;
            e.name = 'Syntax Error';

            return _debug(e);

        }


        function render (data) {

            try {

                return new Render(data) + '';

            } catch (e) {

                if (!isDebug) {
                    return exports.compile(id, source, true)(data);
                }

                e.id = id || source;
                e.name = 'Render Error';
                e.source = source;

                return _debug(e);

            }

        }


        render.prototype = Render.prototype;
        render.toString = function () {
            return Render.toString();
        };


        if (id !== anonymous) {
            _cache[id] = render;
        }


        return render;

    };




    /**
     * 添加模板辅助方法
     * @name    template.helper
     * @param   {String}    名称
     * @param   {Function}  方法
     */
    exports.helper = function (name, helper) {
        exports.prototype[name] = helper;
    };




    /**
     * 模板错误事件
     * @name    template.onerror
     * @event
     */
    exports.onerror = function (e) {
        var content = '[template]:\n'
            + e.id
            + '\n\n[name]:\n'
            + e.name;

        if (e.message) {
            content += '\n\n[message]:\n'
                + e.message;
        }

        if (e.line) {
            content += '\n\n[line]:\n'
                + e.line;
            content += '\n\n[source]:\n'
                + e.source.split(/\n/)[e.line - 1].replace(/^[\s\t]+/, '');
        }

        if (e.temp) {
            content += '\n\n[temp]:\n'
                + e.temp;
        }

        if (global.console) {
            console.error(content);
        }
    };



    // 编译好的函数缓存
    var _cache = {};



    // 获取模板缓存
    var _getCache = function (id) {

        var cache = _cache[id];

        if (cache === undefined && 'document' in global) {
            var elem = document.getElementById(id);

            if (elem) {
                var source = elem.value || elem.innerHTML;
                return exports.compile(id, source.replace(/^\s*|\s*$/g, ''));
            }

        } else if (_cache.hasOwnProperty(id)) {

            return cache;
        }
    };



    // 模板调试器
    var _debug = function (e) {

        exports.onerror(e);

        function error () {
            return error + '';
        }

        error.toString = function () {
            return '{Template Error}';
        };

        return error;
    };



    // 模板编译器
    var _compile = (function () {


        // 辅助方法集合
        exports.prototype = {
            $render: exports.render,
            $escape: function (content) {

                return typeof content === 'string'
                    ? content.replace(/&(?![\w#]+;)|[<>"']/g, function (s) {
                    return {
                        "<": "&#60;",
                        ">": "&#62;",
                        '"': "&#34;",
                        "'": "&#39;",
                        "&": "&#38;"
                    }[s];
                })
                    : content;
            },
            $string: function (value) {

                if (typeof value === 'string' || typeof value === 'number') {

                    return value;

                } else if (typeof value === 'function') {

                    return value();

                } else {

                    return '';

                }

            }
        };


        var arrayforEach = Array.prototype.forEach || function (block, thisObject) {
            var len = this.length >>> 0;

            for (var i = 0; i < len; i++) {
                if (i in this) {
                    block.call(thisObject, this[i], i, this);
                }
            }

        };


        // 数组迭代
        var forEach = function (array, callback) {
            arrayforEach.call(array, callback);
        };


        // 静态分析模板变量
        var KEYWORDS =
            // 关键字
            'break,case,catch,continue,debugger,default,delete,do,else,false'
                + ',finally,for,function,if,in,instanceof,new,null,return,switch,this'
                + ',throw,true,try,typeof,var,void,while,with'

                // 保留字
                + ',abstract,boolean,byte,char,class,const,double,enum,export,extends'
                + ',final,float,goto,implements,import,int,interface,long,native'
                + ',package,private,protected,public,short,static,super,synchronized'
                + ',throws,transient,volatile'

                // ECMA 5 - use strict
                + ',arguments,let,yield'

                + ',undefined';
        var REMOVE_RE = /\/\*(?:.|\n)*?\*\/|\/\/[^\n]*\n|\/\/[^\n]*$|'[^']*'|"[^"]*"|[\s\t\n]*\.[\s\t\n]*[$\w\.]+/g;
        var SPLIT_RE = /[^\w$]+/g;
        var KEYWORDS_RE = new RegExp(["\\b" + KEYWORDS.replace(/,/g, '\\b|\\b') + "\\b"].join('|'), 'g');
        var NUMBER_RE = /\b\d[^,]*/g;
        var BOUNDARY_RE = /^,+|,+$/g;
        var getVariable = function (code) {

            code = code
                .replace(REMOVE_RE, '')
                .replace(SPLIT_RE, ',')
                .replace(KEYWORDS_RE, '')
                .replace(NUMBER_RE, '')
                .replace(BOUNDARY_RE, '');

            code = code ? code.split(/,+/) : [];

            return code;
        };


        return function (source, isDebug) {

            var openTag = exports.openTag;
            var closeTag = exports.closeTag;
            var parser = exports.parser;


            var code = source;
            var tempCode = '';
            var line = 1;
            var uniq = {$data:true,$helpers:true,$out:true,$line:true};
            var helpers = exports.prototype;
            var prototype = {};


            var variables = "var $helpers=this,"
                + (isDebug ? "$line=0," : "");

            var isNewEngine = ''.trim;// '__proto__' in {}
            var replaces = isNewEngine
                ? ["$out='';", "$out+=", ";", "$out"]
                : ["$out=[];", "$out.push(", ");", "$out.join('')"];

            var concat = isNewEngine
                ? "if(content!==undefined){$out+=content;return content}"
                : "$out.push(content);";

            var print = "function(content){" + concat + "}";

            var include = "function(id,data){"
                +     "if(data===undefined){data=$data}"
                +     "var content=$helpers.$render(id,data);"
                +     concat
                + "}";


            // html与逻辑语法分离
            forEach(code.split(openTag), function (code, i) {
                code = code.split(closeTag);

                var $0 = code[0];
                var $1 = code[1];

                // code: [html]
                if (code.length === 1) {

                    tempCode += html($0);

                    // code: [logic, html]
                } else {

                    tempCode += logic($0);

                    if ($1) {
                        tempCode += html($1);
                    }
                }


            });



            code = tempCode;


            // 调试语句
            if (isDebug) {
                code = 'try{' + code + '}catch(e){'
                    +       'e.line=$line;'
                    +       'throw e'
                    + '}';
            }


            code = "'use strict';"
                + variables + replaces[0] + code
                + 'return new String(' + replaces[3] + ')';


            try {

                var Render = new Function('$data', code);
                Render.prototype = prototype;

                return Render;

            } catch (e) {
                e.temp = 'function anonymous($data) {' + code + '}';
                throw e;
            }




            // 处理 HTML 语句
            function html (code) {

                // 记录行号
                line += code.split(/\n/).length - 1;

                if (exports.isCompress) {
                    code = code.replace(/[\n\r\t\s]+/g, ' ');
                }

                code = code
                    // 单引号与反斜杠转义(因为编译后的函数默认使用单引号，因此双引号无需转义)
                    .replace(/('|\\)/g, '\\$1')
                    // 换行符转义(windows + linux)
                    .replace(/\r/g, '\\r')
                    .replace(/\n/g, '\\n');

                code = replaces[1] + "'" + code + "'" + replaces[2];

                return code + '\n';
            }


            // 处理逻辑语句
            function logic (code) {

                var thisLine = line;

                if (parser) {

                    // 语法转换插件钩子
                    code = parser(code);

                } else if (isDebug) {

                    // 记录行号
                    code = code.replace(/\n/g, function () {
                        line ++;
                        return '$line=' + line +  ';';
                    });

                }


                // 输出语句. 转义: <%=value%> 不转义:<%==value%>
                if (code.indexOf('=') === 0) {

                    var isEscape = code.indexOf('==') !== 0;

                    code = code.replace(/^=*|[\s;]*$/g, '');

                    if (isEscape && exports.isEscape) {

                        // 转义处理，但排除辅助方法
                        var name = code.replace(/\s*\([^\)]+\)/, '');
                        if (
                            !helpers.hasOwnProperty(name)
                                && !/^(include|print)$/.test(name)
                            ) {
                            code = '$escape($string(' + code + '))';
                        }

                    } else {
                        code = '$string(' + code + ')';
                    }


                    code = replaces[1] + code + replaces[2];

                }

                if (isDebug) {
                    code = '$line=' + thisLine + ';' + code;
                }

                getKey(code);

                return code + '\n';
            }


            // 提取模板中的变量名
            function getKey (code) {

                code = getVariable(code);

                // 分词
                forEach(code, function (name) {

                    // 除重
                    if (!uniq.hasOwnProperty(name)) {
                        setValue(name);
                        uniq[name] = true;
                    }

                });

            }


            // 声明模板变量
            // 赋值优先级:
            // 内置特权方法(include, print) > 私有模板辅助方法 > 数据 > 公用模板辅助方法
            function setValue (name) {

                var value;

                if (name === 'print') {

                    value = print;

                } else if (name === 'include') {

                    prototype['$render'] = helpers['$render'];
                    value = include;

                } else {

                    value = '$data.' + name;

                    if (helpers.hasOwnProperty(name)) {

                        prototype[name] = helpers[name];

                        if (name.indexOf('$') === 0) {
                            value = '$helpers.' + name;
                        } else {
                            value = value
                                + '===undefined?$helpers.' + name + ':' + value;
                        }
                    }


                }

                variables += name + '=' + value + ',';
            }


        };
    })();




})(template, this);


// RequireJS || SeaJS
if (typeof define === 'function') {
    define(function(require, exports, module) {
        module.exports = template;
    });
    // NodeJS
} else if (typeof exports !== 'undefined') {
    module.exports = template;
}

// Klass
;(function(exports) {

    // shim
    if (typeof Object.create !== "function") {
        Object.create = function(o) {
            function F() {
            }

            F.prototype = o;
            return new F();
        };
    }

    // Utility `proxy`
    var proxy = function(fn, scope) {
        var context = scope || this;

        return fn.bind ? fn.bind(context) : function() {
            return fn.apply(context, arguments);
        };
    };

    // Utility `extend`
    var extend = function(dest, source) {
        var i;
        for (i in source) {
            if (source.hasOwnProperty(i)) {
                dest[i] = source[i];
            }
        }
    };

    /**
     * 类对象原型，原始对象。
     */
    var Klass = {

        // initialize: function() {},

        /**
         * 类对象的 `prototype`，包含初始化方法。
         */
        fn: {
            initialize: function() {
            }
        },

        /**
         * 创建一个类对象
         *
         * @param {Object} props
         * @param {Object} statics
         * @return new klass object
         */
        create: function(props, statics) {
            var object = Object.create(this);
            // object.initialize.apply(object, arguments);

            object.fn = Object.create(this.fn);
            object.parent = this;

            if (props) {
                this.implement.call(object, props);
            }

            if (statics) {
                this.extend.call(object, statics);
            }

            return object;
        },

        /**
         * 初始化构造函数，产生类对象的一个实例。
         * 对于构造函数，相当于调用 `new Constructor`
         *
         * @params {Mixed}
         * @link fn.initialize
         * @return new instance.
         */
        instance: function() {
            var instance = Object.create(this.fn);

            instance.parent = this;
            instance.initialize.apply(instance, arguments);

            return instance;
        },

        /**
         * 扩展类对象的静态方法
         *
         * @param {Object} statics
         * @return `this`
         */
        extend: function(statics) {
            var extended = statics.extended;

            extend(this, statics);
            if (extended) {
                extended.apply(this);
            }

            return this;
        },

        /**
         * 扩展类对象的实例方法
         *
         * @param {Object} props
         * @return `this`
         */
        implement: function(props) {
            var included = props.included;

            extend(this.fn, props);
            if (included) {
                included.apply(this);
            }

            return this;
        }
    };

    Klass.proxy = Klass.fn.proxy = proxy;

    exports.Klass = Klass;
})(this);

(function(window) {

    var userAgent = window.navigator.userAgent,
        proxy = function(fn, scope) {
            return function() {
                return fn.apply(scope, arguments);
            };
        },
        result = function(fn) {
            return typeof fn === 'function' ? fn.call(window) : fn;
        };

    /**
     * @class ImitateFixed
     */
    window.ImitateFixed = Klass.create({
        /**
         * @constructor
         * @param {Object} options 初始化参数
         */
        initialize: function(el, options) {
            if (el) {
                this.el = el;
                this.options = options || {};
                this.options.topOffset = this.options.topOffset || 0;
                if (this.isSupportFixed()) {
                    this.useFixed();
                } else {
                    this.usePosition();
                }
            }
        },

        // private
        isSupportFixed: function() {
            var ios = userAgent.match(/(iPad|iPhone|iPod)[\w\s]*;(?:[\w\s]+;)*[\w\s]+(?:iPad|iPhone|iPod)\sOS\s([\d_\.]+)/i),
                ios5below = ios && ios[2] && (ios[2].split('_')[0] < 5),
                operaMini = /Opera Mini/i.test(userAgent),
                body = document.body,
                div, isFixed;

            div = document.createElement('div');
            div.style.cssText = 'display:none;position:fixed;z-index:100;';
            body.appendChild(div);
            isFixed = window.getComputedStyle(div).position == 'fixed';
            body.removeChild(div);
            div = null;

            return isFixed && !ios5below && !operaMini;
        },
        
        // private
        useFixed: function() {
            var el = this.el;
            if (this.options.autoFixed && window.getComputedStyle(el).position != 'fixed') {
                el.style.position = 'fixed';
            }
        },

        // private
        usePosition: function() {
            var el = this.el;
            el.style.position = 'absolute';
            el.style.top = result(this.options.topOffset);
            this._onScroll = proxy(this.onScroll, this);
            window.addEventListener('scroll', this._onScroll, false);
            this._onScroll();
        },

        // private
        onScroll: function() {
            var pageYOffset = window.pageYOffset,
                topOffset = this.options.topOffset,
                el = this.el;
            clearTimeout(this.scrollEndTimeout);
            el.style.display = 'none';
            this.scrollEndTimeout = setTimeout(function() {
                el.style.top = pageYOffset + result(topOffset) + 'px';
                el.style.display = '';
            }, 200);
        },

        destroy: function() {
            window.removeEventListener('scroll', this._onScroll, false);
            this.el = null;
        }
    });
})(window);


(function(window) {
    var navigator = window.navigator,
        isAndroid = /Android/i.test(navigator.userAgent),
        msPointerEnabled = navigator.msPointerEnabled,
        TOUCH_EVENTS = {
            start: msPointerEnabled ? 'MSPointerDown' : 'touchstart',
            move: msPointerEnabled ? 'MSPointerMove' : 'touchmove',
            end: msPointerEnabled ? 'MSPointerUp' : 'touchend'
        },
        slice = Array.prototype.slice,
        dummyStyle = document.createElement('div').style,
        vendor = (function() {
            var vendors = 't,webkitT,MozT,msT,OT'.split(','),
                t,
                i = 0,
                l = vendors.length;

            for (; i < l; i++) {
                t = vendors[i] + 'ransform';
                if (t in dummyStyle) {
                    return vendors[i].substr(0, vendors[i].length - 1);
                }
            }

            return false;
        })(),
        cssVendor = vendor ? '-' + vendor.toLowerCase() + '-' : '',
        prefixStyle = function(style) {
            if (vendor === '') return style;
            style = style.charAt(0).toUpperCase() + style.substr(1);
            return vendor + style;
        },
        transform = prefixStyle('transform'),
        transitionDuration = prefixStyle('transitionDuration'),
        transitionEndEvent = (function() {
            if (vendor == 'webkit' || vendor === 'O') {
                return vendor.toLowerCase() + 'TransitionEnd';
            }
            return 'transitionend';
        })(),
        noop = function() {},
        addClass = function(elem, value) {
            var classes, cur, clazz, i;
            classes = (value || '').match(/\S+/g) || [];
            cur = elem.nodeType === 1 && ( elem.className ? (' ' + elem.className + ' ').replace(/[\t\r\n]/g, ' ') : ' ');
            if (cur) {
                i = 0;
                while ((clazz = classes[i++])) {
                    if (cur.indexOf(' ' + clazz + ' ') < 0) {
                        cur += clazz + ' ';
                    }
                }
                elem.className = cur.trim();
            }
        },
        removeClass = function(elem, value) {
            var classes, cur, clazz, i;
            classes = (value || '').match(/\S+/g) || [];
            cur = elem.nodeType === 1 && ( elem.className ? (' ' + elem.className + ' ').replace(/[\t\r\n]/g, ' ') : ' ');
            if (cur) {
                i = 0;
                while ((clazz = classes[i++])) {
                    while (cur.indexOf(' ' + clazz + ' ') >= 0) {
                        cur = cur.replace(' ' + clazz + ' ', ' ');
                    }
                }
                elem.className = cur.trim();
            }
        },
        listenTransition = function(target, duration, callbackFn) {
            var me = this,
                clear = function() {
                    if (target.transitionTimer) clearTimeout(target.transitionTimer);
                    target.transitionTimer = null;
                    target.removeEventListener(transitionEndEvent, handler, false);
                },
                handler = function() {
                    clear();
                    if (callbackFn) callbackFn.call(me);
                };
            clear();
            target.addEventListener(transitionEndEvent, handler, false);
            target.transitionTimer = setTimeout(handler, duration + 100);
        };

    var Slide = function(config) {
        config = config || {};
        for (var o in config) {
            this[o] = config[o];
        }

        this.el = typeof this.targetSelector === 'string' ? document.querySelector(this.targetSelector) : this.targetSelector;
        if (msPointerEnabled) this.el.style.msTouchAction = 'pan-y';
        this.el.style.overflow = 'hidden';

        this.wrap = this.wrapSelector ? this.el.querySelector(this.wrapSelector): this.el.children[0];
        this.wrap.style.cssText = cssVendor + 'transform:translate3d(' + (-this.getItemWidth() * this.activeIndex) + 'px,0px,0px);' + cssVendor + 'transition:' + cssVendor + 'transform 0ms;';
        this.items = slice.call(this.wrap.children, 0);

        if (this.prevSelector) {
            this.prevEl = typeof this.prevSelector === 'string' ? document.querySelector(this.prevSelector) : this.prevSelector;
            this.prevEl.addEventListener('click', this, false);
        }
        if (this.nextSelector) {
            this.nextEl = typeof this.nextSelector === 'string' ? document.querySelector(this.nextSelector) : this.nextSelector;
            this.nextEl.addEventListener('click', this, false);
        }
        if (this.indicatorSelector) {
            this.indicators = typeof this.indicatorSelector === 'string' ? document.querySelectorAll(this.indicatorSelector) : this.indicatorSelector;
            this.indicators = slice.call(this.indicators, 0);
        }

        this.el.addEventListener(TOUCH_EVENTS.start, this, false);

        this.to(this.activeIndex, true);

        this.running = false;
        if (this.autoPlay) {
            this.start();
        }
    };

    Slide.prototype = {
        /**
         * @cfg {String} targetSelector 目标元素选取器，items 默认为 targetSelector 的子元素，可以设置itemSelector，查找指定items子元素
         */

        /**
         * @cfg {String} wrapSelector 子元素容器选取器
         */

        /**
         * @cfg {String} prevSelector 向前按钮选取器
         */

        /**
         * @cfg {String} nextSelector 向后按钮选取器
         */

        /**
         * @cfg {String} indicatorSelector 指示器选取器
         */

        /**
         * @cfg {String} indicatorCls 当前activeIndex指示器样式
         */

        /**
         * @cfg {Number} activeIndex 初始显示的元素index，默认0
         */
        activeIndex: 0,

        /**
         * @cfg {Boolean} autoPlay true自动切换，默认true
         */
        autoPlay: true,

        /**
         * @cfg {Number} interval 循环滚动间隔时间，单位ms，默认3000
         */
        interval: 3000,

        /**
         * @cfg {Number} duration 动画持续时间，单位ms，默认300
         */
        duration: 300,

        /**
         * @cfg {iScroll} iscroll 关联一个iscroll对象
         * Carousel Widget 为水平方向滚动，如果被嵌套在一个垂直滚动的 iScroll 组件中，会导致触摸滚动 Carousel的水平滚动 与 iScroll的垂直滚动相冲突，
         * 为了解决这个问题，在水平滑动时，禁用iScroll的垂直滚动，水平滑动结束之后，再启用iScroll。
         */

        /**
         * 开始切换之前回调函数，返回值为false时，终止本次slide操作
         */
        beforeSlide: noop,

        /**
         * 切换完成回调函数
         */
        onSlide: noop,

        // private
        getItemWidth: function() {
            return this.wrap.offsetWidth;
        },

        // private
        getLastIndex: function() {
            return this.items.length - 1;
        },

        // private
        getContext: function(index) {
            var last = this.getLastIndex(),
                prev,
                next;
            if (typeof index === 'undefined') {
                index = this.activeIndex;
            }
            prev = index - 1;
            next = index + 1;
            if (prev < 0) {
                prev = last;
            }
            if (next > last) {
                next = 0;
            }
            return {
                prev : prev,
                next: next,
                active: index
            };
        },

        /**
         * 开始自动切换
         */
        start: function() {
            if (!this.running) {
                this.running = true;
                this.clear();
                this.run();
            }
        },

        /**
         * 停止自动切换
         */
        stop: function() {
            this.running = false;
            this.clear();
        },

        // private
        clear: function() {
            clearTimeout(this.slideTimer);
            this.slideTimer = null;
        },

        // private
        run: function() {
            var me = this;
            if (!me.slideTimer) {
                me.slideTimer = setInterval(function() {
                    me.to(me.getContext().next);
                }, me.interval);
            }
        },

        /**
         * 切换到上一个
         */
        prev: function() {
            this.to(this.activeIndex - 1);
        },

        /**
         * 切换到下一个
         */
        next: function() {
            this.to(this.activeIndex + 1);
        },

        // private
        onPrevClick: function(e) {
            if (e) e.preventDefault();
            this.clear();
            this.prev();
            if (this.autoPlay) this.run();
        },

        // private
        onNextClick: function(e) {
            if (e) e.preventDefault();
            this.clear();
            this.next();
            if (this.autoPlay) this.run();
        },

        /**
         * 切换到index
         * @param {Number} toIndex
         * @param {Boolean} silent 无动画效果
         */
        to: function(toIndex, silent) {
            var active = this.activeIndex,
                last = this.getLastIndex();
            if (toIndex >= 0 && toIndex <= last && toIndex != active && this.beforeSlide(toIndex) !== false) {
                this.slide(toIndex, silent);
            } else {
                this.slide(active, silent);
            }
        },

        // private
        slide: function(toIndex, silent) {
            var me = this,
                active = me.activeIndex,
                lastActive = active,
                handler = function() {
                    me.wrap.removeEventListener(transitionEndEvent, handler, false);
                    me.wrap.style[transitionDuration] = '0ms';
                    if (me.indicators && me.indicatorCls) {
                        if (me.indicators[lastActive]) removeClass(me.indicators[lastActive], me.indicatorCls);
                        if (me.indicators[me.activeIndex]) addClass(me.indicators[me.activeIndex], me.indicatorCls);
                    }
                    me.onSlide(me.activeIndex);
                };
            me.activeIndex = toIndex;

            if (!silent) listenTransition(me.wrap, me.duration, handler);
            me.wrap.style[transitionDuration] = silent ? '0ms' : me.duration + 'ms';
            me.wrap.style[transform] = 'translate3d(' + (-me.getItemWidth() * toIndex) + 'px, 0px, 0px)';
            if (silent) handler();
        },

        // private
        onTouchStart: function(e) {
            var me = this;
            if (me.prevEl && me.prevEl.contains && me.prevEl.contains(e.target) ||
                me.nextEl && me.nextEl.contains && me.nextEl.contains(e.target)) {
                return;
            }

            clearTimeout(me.androidTouchMoveTimeout);
            me.clear();
            if (isAndroid) {
                me.androidTouchMoveTimeout = setTimeout(function() {
                    me.resetStatus();
                }, 3000);
            }

            me.el.removeEventListener(TOUCH_EVENTS.move, me, false);
            me.el.removeEventListener(TOUCH_EVENTS.end, me, false);
            me.el.addEventListener(TOUCH_EVENTS.move, me, false);
            me.el.addEventListener(TOUCH_EVENTS.end, me, false);
            delete me.horizontal;

            var clientX = msPointerEnabled ? e.clientX : e.touches[0].clientX,
                clientY = msPointerEnabled ? e.clientY : e.touches[0].clientY;

            me.touchCoords = {};
            me.touchCoords.startX = clientX;
            me.touchCoords.startY = clientY;
            me.touchCoords.timeStamp = e.timeStamp;
        },

        // private
        onTouchMove: function(e) {
            var me = this;

            clearTimeout(me.touchMoveTimeout);
            if (msPointerEnabled) {
                // IE10 for Windows Phone 8 的 pointerevent， 触发 MSPointerDown 之后，
                // 如果触控移动轨迹不符合 -ms-touch-action 规则，则不会触发 MSPointerUp 事件。
                me.touchMoveTimeout = setTimeout(function() {
                    me.resetStatus();
                }, 3000);
            }
            if (!me.touchCoords) {
                return;
            }

            me.touchCoords.stopX = msPointerEnabled ? e.clientX : e.touches[0].clientX;
            me.touchCoords.stopY = msPointerEnabled ? e.clientY : e.touches[0].clientY;

            var offsetX = me.touchCoords.startX - me.touchCoords.stopX,
                absX = Math.abs(offsetX),
                absY = Math.abs(me.touchCoords.startY - me.touchCoords.stopY);

            if (typeof me.horizontal !== 'undefined') {
                if (offsetX !== 0) {
                    e.preventDefault();
                }
            } else {
                if (absX > absY) {
                    me.horizontal = true;
                    if (offsetX !== 0) {
                        e.preventDefault();
                    }
                    if (me.iscroll && me.iscroll.enabled) {
                        me.iscroll.disable();
                    }
                    clearTimeout(me.androidTouchMoveTimeout);
                } else {
                    delete me.touchCoords;
                    me.horizontal = false;
                    return;
                }
            }

            var itemWidth = me.getItemWidth(),
                translateX = me.activeIndex * itemWidth,
                active = me.activeIndex,
                last = me.getLastIndex();

            if ((active === 0 && offsetX < 0) || (active == last && offsetX > 0)) {
                translateX += Math.ceil(offsetX / Math.log(Math.abs(offsetX)));
            } else {
                translateX += offsetX;
            }
            if (absX < itemWidth) {
                me.wrap.style[transform] = 'translate3d(' + -translateX + 'px, 0px, 0px)';
            }
        },

        // private
        onTouchEnd: function(e) {
            clearTimeout(this.androidTouchMoveTimeout);
            clearTimeout(this.touchMoveTimeout);
            this.el.removeEventListener(TOUCH_EVENTS.move, this, false);
            this.el.removeEventListener(TOUCH_EVENTS.end, this, false);

            if (this.touchCoords) {
                var itemWidth = this.getItemWidth(),
                    absX = Math.abs(this.touchCoords.startX - this.touchCoords.stopX),
                    active = this.activeIndex,
                    transIndex;

                if (!isNaN(absX) && absX !== 0) {
                    if (absX > itemWidth) {
                        absX = itemWidth;
                    }
                    if (absX >= 80 || (e.timeStamp - this.touchCoords.timeStamp < 200)) {
                        if (this.touchCoords.startX > this.touchCoords.stopX) {
                            transIndex = active + 1;
                        } else {
                            transIndex = active - 1;
                        }
                    } else {
                        transIndex = active;
                    }

                    this.to(transIndex);
                    delete this.touchCoords;
                }
            }

            this.resetStatus();
        },

        resetStatus: function() {
            if (this.iscroll) this.iscroll.enable();
            if (this.autoPlay) this.run();
        },

        refresh: function() {
            var last = this.getLastIndex();
            this.items = slice.call(this.wrap.children, 0);
            if (this.activeIndex > last) {
                this.to(last, true);
            }
        },

        handleEvent: function(e) {
            switch (e.type) {
                case TOUCH_EVENTS.start:
                    this.onTouchStart(e);
                    break;
                case TOUCH_EVENTS.move:
                    this.onTouchMove(e);
                    break;
                case TOUCH_EVENTS.end:
                    this.onTouchEnd(e);
                    break;
                case 'click':
                    if (e.currentTarget == this.prevEl) {
                        this.onPrevClick(e);
                    } else if (e.currentTarget == this.nextEl) {
                        this.onNextClick(e);
                    }
                    break;
            }
        },

        /**
         * 销毁
         */
        destroy: function() {
            this.destroyed = true;
            this.stop();
            if (this.prevEl) {
                this.prevEl.removeEventListener('click', this, false);
                this.prevEl = null;
            }
            if (this.nextEl) {
                this.nextEl.removeEventListener('click', this, false);
                this.nextEl = null;
            }
            this.indicators = null;
            this.el.removeEventListener(TOUCH_EVENTS.start, this, false);
            this.el.removeEventListener(TOUCH_EVENTS.move, this, false);
            this.el.removeEventListener(TOUCH_EVENTS.end, this, false);
            this.el = this.wrap = this.items = null;
            this.iscroll = null;
        }
    };

    dummyStyle = null;

    if (typeof define === "function" && (define.amd || seajs)) {
        define('slidewidget', [], function() {
            return Slide;
        });
    }

    window.Slide = Slide;

})(window);

// Statistics @msohu

(function(exports) {
    var $ = exports.Zepto || exports.jQuery;
    exports.Statistics = {
        /**
         * @cfg {String} base
         * base url 
         */
        base: 'http://zz.m.sohu.com/msohu_cv.gif/?',
        
        /**
         * @privare
         */
        params: function(code) {
            var i, params = {};
            if (typeof code === 'string') {
                params._once_ = code;
                params._dc = (+new Date());
            }
            else {
                for (i in code) {
                    params[i] = code[i];
                }
            }
            
            return this.appendParams(params);
        },
        
        /*
         * @private
         */
        appendParams: function(params) {
            var i, paramsArray = [];
            
            for (i in params) {
                if (params.hasOwnProperty(i)) {
                    paramsArray.push(i + '=' + params[i]);
                }
            }
            return paramsArray.join('&');
        },
        
        /**
         * 发送一个简单的统计请求
         * @public
         * @param {String} code 统计码
         * @param {String} base (optional) 统计请求文件地址
         * 
         * example: add _once_
         * Statistics.addStatistics('000027_back2top');
         * 
         * example: add _once_ & _trans_
         * Statistics.addStatistics({
         *     '_once_': '000095_video_newsfinal',
         *     '_trans_': 'aaa'
         * });
         */
        addStatistics: function(code, base) {
            var image;
            
            base = base || this.base;
            
            image = new Image(1, 1);
            image.src = base + this.params(code);
        },
        
        /**
         * 委托事件发送统计请求 
         */
        addGlobalSupport: function() {
            var that = this;
            
            $('body').on('touchend', '[data-code]', ontouchend);
            function ontouchend(e) {
                var target, parent, code;
                e.preventDefault();
                e.stopPropagation();
                //console.log(this);
                
                target = e.target;
                parent = target.parentNode;
                if ((code = target.getAttribute('data-code')) || (code = parent.getAttribute('data-code'))) {
                    that.addStatistics(code);
                }
            }
        }
        
    };
})(this);


(function () {
	var document = window.document,
		Statistics = window.Statistics,
		innerHeight = window.innerHeight,
		innerWidth = window.innerWidth,
		body = document.body,
		baseUrl = ''; //默认的发送统计链接

	/*
	* @param {Object} rootDom : 某块需要统计曝光的DOM元素，默认为body
	* @param {String} exposureCode : 曝光码
	* @param {Function} isStatisElement : 判断一个元素是否是曝光统计元素,参数是一个dom对象，默认为a标签，返回一个对象,有两个属性:{ isNeedStatis: true, param: {} }。
	**/

	function ExposureStatis ( rootDom, exposureCode, isStatisElement ) {

		this.rootDom = rootDom || body;
		this.exposureCode = exposureCode || '';
        this.isStatisElement = isStatisElement || null;
		//所有要统计的曝光元素数组
		/********
		*每个值的格式
		*	{
		*		dom: domObj, //dom对象
				param : {}   //参数对象
		*	}
		***************/
		this.domArr = [];
		//setTimeout对象
		this.statisticsTimer = null;

		this.init( this.rootDom );
	}

	ExposureStatis.prototype = {

		//统计的间隔时间
		intervalTime : 100,

		init : function ( rootDom ){

			this.addElements( rootDom );
			this.sendFirstScreenStatis();
			this.addExposureListen( );
		},

		//添加所有的曝光统计元素
		addElements : function ( rootDom ) {
			var aTagArr = rootDom.getElementsByTagName('a'),
				len = aTagArr.length,
				i;

			if (len === 0) return;
			
			for ( i = 0; i < len; i++ ) {
				this.addElement(aTagArr[i]);
			}
		},

		//添加新的曝光统计元素(传入的参数是dom数组)
		addNewElements : function ( newDomArr ) {
			if ( toString.call(newDomArr) !== '[object Array]' || newDomArr.length === 0) return;

			if( this.domArr.length === 0){
				this.removeExposureListen();
				this.addExposureListen( );
			}
			
			var len = newDomArr.length,
				i;
			for ( i = 0; i < len; i++ ) {
				this.addElement(newDomArr[i]);
			}
		},

		//未滚动的情况下，直接发送首屏已曝光的元素
		sendFirstScreenStatis : function () {
			var that = this;
			//判断所有的元素是否曝光
			this.allIsExposure(that.domArr);
		},

		//添加曝光监听
		addExposureListen : function () {
			var that = this;

			window.addEventListener( 'scroll', proxy( that.exposureListenFunc, that), false );
		},

		//移除曝光监听
		removeExposureListen : function () {
			var that = this;

			window.removeEventListener( 'scroll', proxy( that.exposureListenFunc, that), false);
		},

		//曝光监听函数
		exposureListenFunc : function () {
			var that = this;
			// that.allIsExposure(that.domArr);

			clearInterval(that.statisticsTimer);
			that.statisticsTimer = setTimeout(function () {
					that.allIsExposure(that.domArr);
				}, that.intervalTime);

		},

		//对所有的监听元素，判断是否曝光
		allIsExposure : function ( arr ) {
			var i,
				len = arr.length,
				domArr = this.domArr,
				indexArr = [];

			//没有监听元素时
			if (len === 0) {
				this.removeExposureListen();
				return;
			}

			for ( i = 0; i < len; i++) {
				var isEXpos = this.isExposure(domArr[i].dom);

				if(isEXpos){
					Statistics.addStatistics(domArr[i].param);
					indexArr.push(i);
				}
			}

			this.removeElement(indexArr);
		},

		//增加一个监听元素
		addElement : function ( domObj ) {
			var that = this,
                isStatisElementObj = that.isStatisElement(domObj);

            if(isStatisElementObj.isNeedStatis){
                var tempObj = {};

                tempObj.dom = domObj;
                tempObj.param = {
                    _once_: that.exposureCode,
                    rdm : Math.random().toString().substring(2,15)
                };

               tempObj.param = extend( tempObj.param, isStatisElementObj.param );

                that.domArr.push(tempObj);
            }

		},

		//删除指定的监听元素
		removeElement : function ( indexArr ) {
			this.domArr = remove(this.domArr, indexArr );
		},

		//判断dom元素是否曝光
		//返回Boolean值
		isExposure : function ( domObj ) {
			var overScreenHeight, //网页超出屏幕的高度
			distanceTopHeight;//元素距离屏幕顶部的高度
			if( domObj ) {
				overScreenHeight = getScrollY();
				distanceTopHeight = domObj.offsetTop;
				
				return ( distanceTopHeight > overScreenHeight && distanceTopHeight - overScreenHeight < innerHeight -10) ? true : false;
			}

			return false;
		}

	};

	window.ExposureStatis = ExposureStatis;

	//给数组添加一个删除元素方法
	function remove (arr, index) {
		if( typeof arr === 'object' && toString.call(arr) === '[object Array]'){
			if ( typeof index === 'number' &&  index >= 0 ) {
				return arr.remove ? arr.remove(index) : arr.slice(0, index).concat(arr.slice( index + 1, arr.length));
			} else if ( typeof index === 'object' && toString.call(index) === '[object Array]' ) {
				//传入一个下标数组，删除这些元素
				var newArr = [];
				for ( var i = 0, len = index.length; i < len; i++ ){
					arr[index[i]] = void 0;
				}

				for( var j = 0, arrLen = arr.length; j < arrLen; j++ ){
					if ( arr[j] !== void 0 ) {
						newArr.push(arr[j]);
					}
				}

				return newArr;
			}
			
		}
	}

	// 获取网页超出屏幕的高度
	function getScrollY() {
		return window.pageYOffset || window.scrollY || document.documentElement.scrollTop;
	}

	// 指定函数的运行作用域
	function  proxy ( fun, context ) {
		var source = context || this;

		return fun.bind ?  fun.bind(source) : function () {
			fun.apply(source, arguments);
		};
	}

    // 扩展对象的属性
    function extend ( c, p ){
        var isObject = function ( p ){
            return Object.prototype.toString.call(p) === '[object Object]';
        };

        if( !isObject(c) || !isObject(p) ) return;

        for ( var i in p ){
            if(p.hasOwnProperty(i)){
                c[i] = p[i];
            }
        }

        return c;
    }
})(window);

function initSohuMobilePlayer() {
    window.SohuMobilePlayerPool = [];
    window.SohuMobilePlayerPool.ver = 'new';
    var videoNodes = $('.finVideo').find('.player'), id, vids, option, adClose;
    $.each(videoNodes, function(index, node) {
        id = '#' + node.getAttribute('id');
        vids = node.getAttribute('desc');
        if(document.getElementById('adclose') != null){
            adClose = document.getElementById('adclose').getAttribute('desc');
        }

        if (vids) {
            if (vids.indexOf('http://') !== -1) {
                //============= 调用方式修改1 - 开始 ===============
                option = {
                    vids: vids,
                    channeled: '1200110001'
                };
                window.SohuMobilePlayerPool = new SohuMobilePlayer(id, option);
                //============= 调用方式修改1 - 结束 ==============
                window.SohuMobilePlayerPool.ver = 'old';
            } else {
                vids = JSON.parse(vids.replace(/'/g, '"'));
                //============= 调用方式修改2 - 开始 ==============
                option = {
                    vids: vids.join(','),
                    autoplay: false,
                    channeled: '1200110001',
                    adClose: adClose
                };
                var player = new SohuMobilePlayer(id, option);
                //============= 调用方式修改2 - 结束 ==============

                SohuMobilePlayerPool.push(player);
            }
            Statistics.addStatistics({
                '_once_': '000095_video_newsfinal',
                '_trans_': window.CONFIG.videoTrans || ''
            });
            node.removeAttribute('desc');
        }
    });
}




;(function() {
    
    var $ = window.Zepto || window.jQuery;
    
    var duration = 200;
    if (/Android/i.test(window.navigator.userAgent)) duration = 0;
    
    var GalleryFin = function() {
        this.id = Gallery.getId();
        var newsApiUrl={
            newsPic_n: Gallery.setApi('/api/n/news/%id%/pic/', this.id),
            newsPic_o: Gallery.setApi('/api/o/news/%id%/pic/', this.id),
            newsPicMore: Gallery.setApi('/api/news/%id%/related_pic/', this.id)
        };
        var dataUrl={
            dataMore: newsApiUrl.newsPicMore,
            data: ($('#coop_news').length>0) ?newsApiUrl.newsPic_o : newsApiUrl.newsPic_n
        };
        this.bodyScrollTop = 0;
        this.gallery = new Gallery({
            statHead: '000027',
            urls: dataUrl,
            plugins: [
                new Gallery.Addins.ShowOrigin()
            ],
            defaultShow: false,
            defaultBackToFin: true,
            transitionDuration: duration,
            titleData: $('body .fin h1')[0].innerHTML,
            backCallBack: {
                fuc: this.resetShow,
                self: this
            }
        });

        window.addEventListener('hashchange', $.proxy(this.onHashChange, this), false);

    };
    
    GalleryFin.prototype.onHashChange = function(e) {
        /*
         * 这个函数是处理正文页，打开组图功能之后，使用浏览器后退功能时，关闭组图
         */
        if (window.location.hash === '') {
            this.resetShow(e);
        }
    };
    
    GalleryFin.prototype.resetShow = function(e) { 
        Gallery.statistics('000027_picsback_v3');

        if (window.location.hash == '#p') { window.history.go(-1); return; }
        if (this.gallery.visible) this.gallery.hide();
        e.preventDefault();
    };

    GalleryFin.prototype.showPic = function(e) {
        var d = e.target, silent = true;
        var finPic = $(d).closest('.finPic');
        var img = finPic.find('.img img');
        // 对于加载更多加载出的图片，需要为它们设置data属性
        if (!img.attr('data-pic-order')) {
            $('.finCnt img').each(function(i) {
                $(this).attr('data-pic-order', i + 1);
            });
        }

        if (img.attr('data-pic-order')) {
            var _smuid = window.CookieUtil.get("_smuid");
            var requestJson = {
                v: 3,
                _smuid: _smuid,
                _smuid_type: _smuid ? 2 : 1,
                tt: new Date().getTime()
            };
            Statistics.addStatistics(requestJson, 'http://zz.m.sohu.com/c.gif?');

            Gallery.statistics('000027_pics_largev3');

            /*
             * 正文页打开组图时，给URL增加一个hash锚点，防止点击浏览器后退按键时，正文页退回到新闻列表页
             * 点击浏览器后退按键，是一个非正常退出组图的操作，正确退出组图的方式应当单击左上角的“回退”
             * 当用户点击浏览器后退时，根据hash的特性，页面此时的url是从#p回退到没有锚点的状态，如下：
             * 打开组图时的URL：
             *      http://t2.m.sohu.com/n/367045217/?wscrid=1137_6#p
             * 点击浏览器回退后变为：
             *      http://t2.m.sohu.com/n/367045217/?wscrid=1137_6
             * 此时，页面并未发生跳转，还是在正文页，这次可以利用hashchange事件，检测是否需要关闭组件
             */
            var href = window.location.href;
            window.location.href = (href.indexOf('#') != -1 ? href.substring(0, href.indexOf('#')) : href) + '#p';

            this.gallery.show(+img.attr('data-pic-order'), silent);  // 显示点击的图片
            // 显示图库的时候重载video frame 或 pause video
            if (SohuMobilePlayerPool.ver == 'old') {
                // 旧版，直接调用类的静态函数
                window.SohuMobilePlayer.reload();
            }
            else if (SohuMobilePlayerPool.length > 0) {
                SohuMobilePlayerPool.forEach(function(o, i) {
                    try { 
                        // 新版，调用每个对象的函数
                        o.pause();
                    }
                    catch(e) {}
                });
            }
        }
    };

    window.GalleryFin = GalleryFin;
}());





(function (window) {
	var body;

	function NativeAjax (opts) {

		this.type = opts.type || 'GET';
		this.url = opts.url || '';
		this.data = opts.data || '';
		this.dataType = opts.dataType || 'json';
		this.async = opts.async || true;
		this.success = opts.success;
		this.error = opts.error;

		this.XHR = null;

		this.init();
	}

	NativeAjax.prototype = {

		init : function  () {
			this.createXHR();
			this.setXHR();
			this.open();
			this.send();
		},

		//创建XHR对象
		createXHR : function () {
			var xhr;

			if (window.ActiveXObject) {
				xhr = new ActiveXObject("microsoft.xmlhttp");
			}else if(window.XMLHttpRequest) {
				xhr = new XMLHttpRequest();
			}

			this.XHR = xhr;
		},

		setXHR : function () {

			this.XHR.onreadystatechange = proxy( this._readyStateChange, this);

			if ( this.type === 'get' || this.type === 'GET' ) {
				this.type = 'GET';
				if (this.data) {
					this.url = this.url + (this.url.indexOf('?') === -1 ? '?' : '&') + params(this.data);
				}
			}else if ( this.type === 'post' || this.type === 'POST' ) {
				this.type = 'POST';
				this.XHR.setRequestHeader("content-type","application/x-www-form-urlencoded");
			}else {
				console.log('error');
			}

			if (this.dataType === 'text' || this.dataType === 'TEXT') {
				this.dataType = 'text';
			}else if(this.dataType === 'xml' || this.dataType === 'XML'){
				this.dataType = 'xml';
			}else if(this.dataType === 'json' || this.dataType === 'JSON'){
				this.dataType = 'json';
			}

		},

		open : function () {
			this.XHR.open( this.type, this.url, this.async );
		},

		send : function () {
			var that = this;

			if (this.type === 'GET') {
				this.XHR.send(null);
			}else if(this.type === 'POST'){
				this.XHR.send(that.data);
			}
		},

		stop : function () {
			if (this.XHR) {
				this.XHR.abort();
			}
		},

		_readyStateChange : function () {
			var XHR = this.XHR;
			if (XHR.readyState === 4 && XHR.status === 200 && this.success) {
				if (this.dataType === 'text') {
					this.success(XHR.responseText);
				}else if ( this.dataType === 'xml' ) {
					this.success(XHR.responseXML);
				}else if ( this.dataType === 'json' ){
					this.success(eval('(' + XHR.responseText + ')'));
				}
			}
		}

	};

	//把对象转换为序列化的字符串
	function params (obj) {
		var i,
			arr;

		if ( typeof obj === 'object' && !!obj ) {
			for( i in obj ){
				if (obj.hasOwnProperty(i)) {
					arr.push(i + '=' + obj[i] );
				}
			}
			return arr.join('&');
		}
	}

	//指定函数的运行作用域
	function  proxy ( fun, context ) {
		var source = context || this;

		return fun.bind ?  fun.bind(source) : function () {
			fun.apply(source, arguments);
		};
	}

	window.NativeAjax = NativeAjax;

})(window);

(function(window) {
    var body = document.body,
        Zepto = window.Zepto,
        $body = Zepto(body),
        $nav = $body.children('.siteNav'),
        $stream = $body.children('.stream'),
        $loadMore = $body.children('.loadMore'),
        CFG = window.CONFIG || {},
        template = window.template,
        page = CFG.page,
        loading = false,
        latest = false,
        imageLoader,
        touchStartY,
        Statistics = window.Statistics,
        ExposureStatis = window.ExposureStatis,
        NativeAjax = window.NativeAjax,
        baseStatisNum = '000118',
        adStatisNum = '000000',
        onceCode = window.CONFIG.once || '000118_click',
        isFinalPage = !!window.article_config;

    var requestNum = 1;

    template.helper('handleScoreData', function(param) {
        return param ? '&_p=' + param : '';
    });

    /*
    <%if ( data[i]["type"] == "ad" ) {%>
        <%=data[i]["url"]%>
    <%}else if ( data[i]["type"] == "p" ) {%>
        /p/<%= data[i]["id"] %>/?v=3&seq=<%= data[i]["seq"] %><%=handleScoreData(data[i].score)%>
    <%}else if ( data[i]["type"] == "fr" ) {%>
        /fr/<%= data[i]["id"] %>/?v=3&seq=<%= data[i]["seq"] %><%=handleScoreData(data[i].score)%>
    <%}else{%>
        /n/<%= data[i]["id"] %>/?v=3&seq=<%= data[i]["seq"] %><%=handleScoreData(data[i].score)%>
    <%}%>
    */
    var streamRender = template.compile('\
        <% for (var i = 0; i < data.length; i++) { %>\
            <a \
                href="<%if ( data[i]["type"] == "ad" ) {%><%=data[i]["url"]%><%}else if ( data[i]["type"] == "p" ) {%>/p/<%= data[i]["id"] %>/?v=3&seq=<%= data[i]["seq"] %><%=handleScoreData(data[i].score)%><%}else if ( data[i]["type"] == "fr" ) {%>/fr/<%= data[i]["id"] %>/?v=3&seq=<%= data[i]["seq"] %><%=handleScoreData(data[i].score)%><%}else{%>/n/<%= data[i]["id"] %>/?v=3&seq=<%= data[i]["seq"] %><%=handleScoreData(data[i].score)%><%}%>"\
                class="feed <% if (data[i]["type"] == "n" || data[i]["type"] == "fe" || data[i]["type"] == "fr" || ( data[i]["type"] == "ad" && data[i]["review"] !== "" ) ) { %><% if (!data[i]["image"]) { %>feed_simple<% } else { %>feed_full<% } %><% } else if (data[i]["type"] == "p" || ( data[i]["type"] == "ad" && data[i]["review"] === "" ) ) { %>feed_gallery<% } %>"\
                data-type = "<%if ( data[i]["type"] == "ad" ) {%>ad<%}else{%>news<%}%>"\
                index = "<%=i%>">\
            <div class="title"><%= data[i]["sub_title"] %></div>\
                <div class="cnt">\
                    <% if (data[i]["image"]) { %>\
                    <div class="picContainer">\
                    <div class="pic">\
                        <div class="img">\
                            <img src="<%= data[i]["image"]["url"] %>" alt="<%= data[i]["image"]["alt"] %>" ">\
                            <% if (data[i]["type"] == "p") { %><i class="i iFeedGallery"><%= data[i]["image_count"] %></i><% } %>\
                        </div>\
                    </div>\
                    </div>\
                    <% } %>\
                    <div class="des">\
                        <div class="brief"><% if (data[i].review) { %>\
                        <div class="text"><%= data[i].review %></div>\
                        <% } %></div>\
                        <div class="info">\
                            <div class="opt toSource"><%= data[i]["media"] %></div>\
                            <%if ( data[i]["type"] !== "ad") {%>\
                                <div class="opt toCmts"><i class="i i1"></i><%= data[i]["comment_count"] %></div>\
                            <%}%>\
                        </div>\
                    </div>\
                </div>\
            </a>\
        <% } %>\
    ');

    // 曝光码发送对象
    var exposureStatis;

    init();

    function init() {
        focusMap();
        bindEvents();

        // feed流中每条新闻的曝光统计
        // 区分正文页和首页流的曝光码
        exposureStatis = isFinalPage ? (new ExposureStatis(null, baseStatisNum + '_finexposure', isStatisElement)) : (new ExposureStatis(null, baseStatisNum + '_exposure', isStatisElement));

    }

    function bindEvents() {
        Zepto(window).scroll(onScroll);

        // 发送广告的点击统计
        $stream.on('click', 'a', function(e) {
            if ($(this).attr('data-type') === 'ad') {
                e.preventDefault();

                var tempStr = isFinalPage ? '_finadclick' : '_adclick',
                    tempUrl = $(this).attr('href'),
                    index = this.getAttribute('index'),
                    adType;

                if ($(this).hasClass('feed_simple"')) {
                    adType = 'info_bannertxt';
                } else if ($(this).hasClass('feed_full')) {
                    adType = 'info_pictxt';
                } else if ($(this).hasClass('feed_gallery')) {
                    adType = 'info_bigpictxt';
                }

                Statistics.addStatistics({
                    _once_: baseStatisNum + tempStr,
                    index: index,
                    freq: requestNum,
                    type: adType
                });

                // 延迟200ms跳转
                var timer = setTimeout(function() {
                    timer = null;
                    window.location.href = tempUrl;
                }, 200);
            }
        });
    }

    /**********************功能函数***************************/
    function focusMap() {
        // 头条幻灯片
        
    if (document.querySelector('.topic-info')) {

        var imgs = Array.prototype.slice.call(document.querySelectorAll('.topic-item img'));
        if (imgs.length > 1) {
             homeSlide = new Slide({
                targetSelector: '.topic-info',
                prevSelector: '.topic-info .page-prev',
                nextSelector: '.topic-info .page-next',
                onSlide: function(index) {
                    if (index === 0) {
                        this.prevEl.children[0].style.opacity = '.5';
                        this.nextEl.children[0].style.opacity = '';
                    } else if (index == this.getLastIndex()) {
                        this.prevEl.children[0].style.opacity = '';
                        this.nextEl.children[0].style.opacity = '.5';
                    } else {
                        this.prevEl.children[0].style.opacity = '';
                        this.nextEl.children[0].style.opacity = '';
                    }
                    
                    window.onresize = function(){
                        document.querySelector("#topic-swipe").style.transform="translate3d(-"+(document.body.clientWidth*index)+"px, 0px, 0px)";
                        for(var i=0;i<document.querySelectorAll(".topic-item").length;i++){
                            document.querySelectorAll(".topic-item")[i].style.left=document.documentElement.clientWidth*i+"px";
                        }
                    };
                }
            });
                //因为使用碎片，碎片使用了延迟加载，只能js变换img的真实src
                /*Zepto(imgs).each(function () {
                    if(Zepto(this).attr('original')){
                         Zepto(this).attr('src', Zepto(this).attr('original'));
                    }
                });*/
            } else {
                document.querySelector('.topic-info .page-wrapper').style.display = 'none';
            }

        }
    }


    function loadNext() {
        if (!loading && !latest) {
            loading = true;

            var streamArr = $('.stream').find('a'),
                lastUrl = streamArr.length === 0 ? '' : streamArr[streamArr.length - 1].getAttribute('href'),
                seq,
                regResult;
            if (regResult = /&seq=(\d+)/.exec(lastUrl)) {
                seq = parseInt(regResult[1], 10) + 1;
            } else {
                seq = 1;
            }

            //t2.m.sohu.com/recommend/api/msg?seq=1
            new NativeAjax({
                type: 'get',
                url: '/recommend/api/msg?seq=' + seq, // TODO 临时修改seq,为了测试
                dataType: 'json',
                success: function(response) {
                    Statistics.addStatistics(baseStatisNum + '_load');

                    if (response.data.length > 0) {
                        $newsobj = $(streamRender(response));
                        requestNum++;
                        // 兼容打底数据，至少添加_once_码
                        $newsobj.each(function(i) {
                            if (this.nodeType === 1) {
                                // 需要_once_,impress_id,others等参数
                                $(this).attr('href', $(this).attr('href') + (isFinalPage ? '&_once_=' + baseStatisNum + '_finclick' : '&_once_=' + baseStatisNum + '_click'));
                            }
                        });
                        if (!!response.bucket_id) {
                            $newsobj.each(function(i) {
                                if (this.nodeType === 1) {
                                    // 需要_once_,impress_id,others等参数
                                    $(this).attr('href', $(this).attr('href') + '&bucketId=' + response.bucket_id + (response.impression_id ? '&_imp=' + response.impression_id : '') + (response.others ? '&_o=' + response.others : ''));
                                }
                            });
                        }
                        $stream.append($newsobj);
                    }
                    page = response.page;

                    // 添加新的曝光统计元素
                    var reg = /<\/a\>/g,
                        newsDomsStr = streamRender(response),
                        len = newsDomsStr.match(reg) ? newsDomsStr.match(reg).length : 0,
                        aTagArr = $stream.find('a');
                    if (len > 0) {
                        $newsobj = aTagArr.slice(-len, -1);
                        $newsobj.push(aTagArr.slice(-1)[0]);
                        exposureStatis.addNewElements($newsobj);
                    }

                    if (response.data.length < 0) {
                        latest = true;
                        $loadMore.hide();
                    }

                    loading = false;
                }
            });

            //zepto的返回的数据，中文是乱码，未找到原因，用原生的Ajax处理。
            /* Zepto.ajax({
                 //http://域名/api/dc/msg?seq=#SEQ#&length=20
                 url: '/api/dc/msg',
                 type: 'GET',
                 dataType: 'json',
                 data: {
                         'seq': seq
                     },
                 success: function(response){
                     Statistics.addStatistics(baseStatisNum + '_load');
                     
                     if(response.data.length > 0){
                         $newsobj = $(streamRender(response));
                         $stream.append($newsobj);
                     }
                     page = response.page;

                     //添加新的曝光统计元素
                     var reg = /<\/a\>/g,
                         newsDomsStr = streamRender(response),
                         len = newsDomsStr.match(reg) ? newsDomsStr.match(reg).length : 0;
                     if(len > 0) {
                         $newsobj = $stream.find('a').slice(-len, -1);
                         exposureStatis.addNewElements($newsobj);
                     }
                     
                     if (response.data.length < 5) {
                         latest = true;
                         $loadMore.hide();
                     }
                 },
                 complete: function(xhr, type){
                     loading = false;
                 }
             });*/
        }

    }


    function autoPush() {
        var $dom = Zepto([
            '<div class="tip pushTip init">',
            '<div class="wrap">',
            '<div class="status status1">推荐了4条您感兴趣的新资讯，点击查看</div>',
            '<div class="status status2">加载中......</div>',
            '<div class="status status3">网络不给力</div>',
            '</div>',
            '</div>'
        ].join(''));
        $dom.on('click', function(e) {
            if ($dom.hasClass('fail')) return;
            $dom.removeClass('init').addClass('loading');
            Statistics.addStatistics('000090_feed');

            Zepto.ajax({
                url: '/api/feed/recommend/' + channel + '/',
                type: 'GET',
                dataType: 'json',
                success: function(response) {
                    $dom.addClass('init');
                    $stream.prepend(streamRender(response));
                    // imageLoader.scan($stream[0]);
                    if (window.pageYOffset > 0) window.scrollTo(0, 1);
                },
                error: function(xhr, type) {
                    $dom.addClass('fail');
                    setTimeout(function() {
                        $dom.removeClass('fail').addClass('init');
                    }, 3 * 1000);
                },
                complete: function(xhr, type) {
                    $dom.removeClass('loading');
                }
            });

        });
        $dom.appendTo($nav);
    }

    function onScroll() {
        var y = window.pageYOffset;
        // fixedNav(y);
        if (y + window.innerHeight + 50 > body.scrollHeight) {
            loadNext();
            /*if (!window.article_config) {   
            }*/
        }
    }


    // 判断元素是否是需要统计的元素,返回需要统计的参数
    function isStatisElement(domObj) {

        var result = {
                isNeedStatis: false,
                param: {}
            },
            tempStr = isFinalPage ? '_finadexposure' : '_adexposure',
            dataType = domObj.getAttribute('data-type'),
            index = domObj.getAttribute('index'),
            adType;

        if (!domObj || domObj.tagName.toLowerCase() !== 'a') return result;

        if ($(domObj).hasClass('feed_simple"')) {
            adType = 'info_bannertxt';
        } else if ($(domObj).hasClass('feed_full')) {
            adType = 'info_pictxt';
        } else if ($(domObj).hasClass('feed_gallery')) {
            adType = 'info_bigpictxt';
        }

        var domUrl = domObj.getAttribute('href'),
            newsRegResult = /\/([np])\/(\d+)/.exec(domUrl),
            paramsObj = formatUrlParam(domUrl);

        if (newsRegResult) {
            // 新闻元素
            result.isNeedStatis = true;
            if (domUrl.indexOf('_imp') === -1) {
                result.param = {
                    type: newsRegResult[1],
                    id: newsRegResult[2]
                };
            } else {
                result.param = {
                    type: newsRegResult[1],
                    id: newsRegResult[2],
                    _imp: paramsObj['_imp'] || '',
                    _p: paramsObj['_p'] || '',
                    _o: paramsObj['_o'] || ''
                };
            }

        } else if (dataType === 'ad') {
            // 广告元素
            result.isNeedStatis = true;
            result.param = {
                _once_: baseStatisNum + tempStr,
                index: index,
                freq: requestNum,
                type: adType
            };
        }

        return result;
    }

    //把url的参数变为对象
    function formatUrlParam(url) {
        if (typeof url !== 'string' || url.indexOf('?') === -1) return {};

        var paramsStr = url.split('?')[1],
            paramsArr = paramsStr.split('&'),
            i = 0,
            len = paramsArr.length,
            result = {},
            oneParamArr;

        for (; i < len; i++) {
            oneParamArr = paramsArr[i].split('=');
            result[oneParamArr[0]] = oneParamArr[1];
        }

        return result;
    }

})(window);

(function (window) {
	var body = document.body,
        $ = window.Zepto,
        $body = $(body),
        $nav = $body.children('.siteNav'),
        $stream = $body.children('.stream'),
        $loadMore = $body.children('.loadMore'),
        CFG = window.CONFIG || {},
        channel = CFG.channel,
        page = CFG.page,
        loading = false, latest = false,
        imageLoader,
        touchStartY,
        Statistics = window.Statistics,
        config_data = window.article_config,
        baseStatisNum = '000118'; 

 //新闻页视频代码
 //不太确定是否有用，先放到这里
if(config_data){
    var newsChannel = config_data.channel_long_path[0][1].match(/\d+/);
    var v_config = {
        newsChannel: newsChannel,
        videoNode: 'video',
        videoCoverNode: '[sid^="player_cover"]',
        videoCoverNode_1: '[sid="player_cover1"]',
        videoCoverNode_2: '[sid="player_cover2"]',
        videoDesNode: '.video .des',
        videoMoreNode: '[mid="more_video"]'
    };

    var n_config = {
        newsId: config_data.news_id,
        showMoreBtn: '.spreadLast',
        setFontBtn: '.setFont',
        layoutNode: '.layout',
        layNode: '.lay',
        originPicNode: '.popOrigPic2',
        originPicNode_img: '.popOrigPic2 img',
        imgNode: '.cnt .pic .img img',
        bigIcon: '.cnt .fuc',
        cnt: '.cnt',
        restCnt: '#rest_content'
    };



    /*新闻正文页代码*/
    var News = function(config) {
        if(!this instanceof News)
            return new News(config);
        this.config = config;
        this.newsId = config.newsId;//传入当前新闻的id
        this.showMoreBtn = $(config.showMoreBtn);
        this.setFontBtn = $(config.setFontBtn);
        this.layoutNode = $(config.layoutNode);
        this.layNode = $(config.layNode);
        this.originPicNode = $(config.originPicNode);
        this.originPicNode_img = $(config.originPicNode_img);
        this.imgNode = $(config.imgNode);
        this.bigIcon = $(config.bigIcon);
        this.cnt = $(config.cnt);
        this.restCnt = $(config.restCnt);
        this.init();
    };
    News.prototype = {
        constructor: News,
        init: function() {
            this.bindUI();
        },
        bindUI: function() {
            var self = this;
            if(self.showMoreBtn.length)
                self.showMoreBtn.get(0).addEventListener('click', function() {
                    self.show_more_content();
            }, false);
        },
        show_more_content: function() {
            var self = this, len = self.imgNode.length;

            self.showMoreBtn.eq(0).html('<img width="16px" height="16px" src="http://s1.rr.itc.cn/p/images/rest_news_loading.gif" />正在加载..');
            self.showMoreBtn.css('font-size','14px');
            var source = document.getElementById('coop_news');
            source = source && source.value ? 'o' : 'n';

            var hide_btn = $('.spreadLast').eq(0) || self.showMoreBtn.eq(0);
            Statistics.addStatistics('000027_remainv3');
            var url='/api/' + source + '/v3/rest/' + self.newsId + '/?_once_=000118_click';
            if(window.location.href.indexOf('partner=ucweb')!=-1){
                url=url+'&partner=ucweb';
            }

            $.ajax({
                url: url,
                dataType: 'json',
                success: function(result){
                    if (result) {
                        self.showMoreBtn.eq(0).html('');
                        hide_btn.hide();
                        var json = result;
                        if(!(json instanceof Object))
                            json = JSON.parse(result);
                        if(json.state == 1){
                            self.restCnt.html(json.rest_content);
                        }
                        self.restCnt.show();
                        // lazyLoader.scan(self.restCnt[0]);
                        window.initSohuMobilePlayer();
                    } else {
                        self.showMoreBtn.eq(0).html('网络中断,请重试');
                        self.showMoreBtn.find('em').hide();
                    }
                },
                error: function(xhr, type){
                    //alert(xhr.status+"||||"+type);
                    self.showMoreBtn.eq(0).html('网络中断,请重试');
                    self.showMoreBtn.find('em').hide();
                }
            });
            
            // 重新刷新广告
            // self.reloadAd();
        },
        reloadAd: function () {
            var ad = $('script[src*="ad.js"]');
            if (ad.length === 0)  {
                return;
            }
            new Image().src = ad[0].src + '?' + Date.now();
            new Function(ad.next('script').text())();
        }
    };

    // Touchable container.
    var Touchable = {};
    var article = $('article.fin');

    App = {
        addFeatures: function() {

                // toggleNav toggleShare toggleSetToolBar
                var navMini = $('nav.mini2');
                var showNav = $('header .showNav a');
                var setFuc = article.find('#setFuc');
                var androidApk = article.find('#androidApk');
                var shareFuc = article.find('#shareFuc');
                var setToolBar = article.find('#setToolBar');
                var shareToolBar = article.find('#shareToolBar');

                //ToggleExpand.toggle(showNav, navMini, "noDis", function() {Statistics.addStatistics('000027_topmore');});
                //ToggleExpand.toggle(setFuc, setToolBar, "noDis");
                
                if ( (/android/i.test(window.navigator.userAgent) || /Adr/i.test(window.navigator.userAgent) ) && androidApk.length > 0) {
                    navMini.after(setToolBar);
                    //console.log(setToolBar);
                    //ToggleExpand.toggle(showNav, setToolBar, "noDis");
                    setFuc.hide();
                    androidApk.show();
                }
                
                //删除图片浏览插入的广告
                if ($('#j_pic_bottom_ad')) {
                    $('#j_pic_bottom_ad').remove();
                }


                //setToolBar
                ({
                    init:function(){
                        setToolBar.find('.changeFont a').on('touchend', this.changeFont);
                        setToolBar.find('.readModel a').on('touchend', App.changeModel);
                    },
                    changeFont:function(){
                        var oFinCnt = article.find('.finCnt');
                        var fontSize = oFinCnt.css('font-size');
                        var num = parseInt(fontSize, 10);

                        if(this.id == 'addFont'){
                            if(num < 18){
                                $(this).removeClass('dis');
                                $('#decreaseFont').removeClass('dis');
                                num = num + 2;
                                if(num == 18){
                                    $(this).addClass('dis');
                                 }
                            }else{
                                $(this).addClass('dis');
                            }
                        }else if(this.id == 'decreaseFont'){
                            if(num > 14){
                                $(this).removeClass('dis');
                                $('#addFont').removeClass('dis');
                                num = num - 2;
                                if(num == 14){
                                    $(this).addClass('dis');
                                }
                            }else{
                                $(this).addClass('dis');
                            }
                        }
                        oFinCnt.css('font-size',num + 'px');
                        Store.set('font_size',num);
                        CookieUtil.set('font_size',num);
                    }
                }).init();

                //original img
                ({
                    init:function(){
                        //if (article.find('.toGallery').length > 0) this.galleryFin = new GalleryFin();
                        this.galleryFin = new GalleryFin();

                        article.find('.finCnt').on('click', $.proxy(this.viewImg , this));
                        //this.parentObj.on('click', $.proxy(this.viewImg , this));
                    },

                    viewImg:function(e)
                    {
                        var d = e.target;
                        var $d = $(d);
                        var src, finPic;

                        if($d.closest('.finPic').length === 0)return;

                        e.preventDefault();
                        this.galleryFin.showPic(e);

                        /*if(d.tagName.toLocaleLowerCase() == 'img' ){  //点击图片
                            //e.preventDefault();
                            src = $d.attr('src');
                            finPic = $d.closest('.finPic');
                            if(*//*d.width == 300 || *//* $d.closest('.finPicView').length === 0 ){
                                finPic.addClass('finPicView');
                                //$d.attr('src',src.replace('/u/','/org/'));
                                $d.attr('src',src.replace('/g/','/org/'));
                            }else{
                                finPic.removeClass('finPicView');
                                //$d.attr('src',src.replace('/org/','/u/'));
                                $d.attr('src',src.replace('/org/','/g/'));
                            }
                        }else if($d.attr('className') == 'fuc_zoom' || $d.parent().attr('className') == 'fuc_zoom'){  // 点击放大镜
                            e.preventDefault();
                            Statistics.addStatistics('000027_pics_maxv3');
                            var img = $d.closest('.finPicImg').find('img');
                            src = img.attr('src');
                            finPic = $d.closest('.finPic');
                            var finPicW = finPic.css('width');
                            console.log(finPicW);
                            if(*//*finPicW == '300px' ||*//* $d.closest('.finPicView').length === 0 ){
                                finPic.addClass('finPicView');
                                //img.attr('src',src.replace('/u/','/org/'));
                                img.attr('src',src.replace('/g/','/org/'));

                            }
                        }else if($d.attr('className') == 'togallery' || $d.parent().attr('className') == 'togallery' || $d.parent().parent().attr('className') == 'togallery'){  // 进图库
                            e.preventDefault();
                            if (this.galleryFin) this.galleryFin.showPic.call(this.galleryFin, e);
                        }*/
                    }
                }).init();

                // Touchable nav
                ({
                    el: $('nav.crumb'),
                    oCrumbBg : $('nav.crumb .crumbBg'),
                    oToMore : $('nav.crumb p.toMore'),


                    init: function() {
                        this.el.on({
                            'touchstart': $.proxy(this.touchhandler,this),
                            'touchmove' : $.proxy(this.touchhandler,this),
                            'touchend'  : $.proxy(this.touchhandler,this)

                        });
                        this.el.find('.toMore > a').on('click', $.proxy(this.fnToMore , this)); //点击箭头
                        this.oCrumbBg.css('left','0');
                        var crumbBgW = parseInt(this.oCrumbBg.css('width'), 10);
                        var screenW = window.innerWidth;
                        var maxLeft =  crumbBgW - (screenW - 69);   // 69是toHome和toMore两块的宽度和
                        this.maxLeft = maxLeft;
                        if( maxLeft > 0){
                            this.el.css('padding','0 30px 0 33px');
                            this.el.find('.crumbBgs').css('margin','0 0 0 6px');
                            this.oToMore.css('display','block');
                            this.oCrumbBg.css('left', "-" + maxLeft + 'px');
                            this.oToMore.find('a').addClass('on');
                        }

                    },
                    //点击箭头，左右滑动到头
                    fnToMore: function(e) {
                        e.preventDefault();
                        var curLeft = parseInt(this.oCrumbBg.css('left'), 10);

                            if(curLeft === 0){
                                this.oCrumbBg.css('left', "-" + this.maxLeft + 'px');
                                this.oToMore.find('a').addClass('on');
                                Statistics.addStatistics('000027_mianbaoxie_end');
                            }else if( curLeft == -this.maxLeft){
                                this.oCrumbBg.css('left',0);
                                this.oToMore.find('a').removeClass('on');
                                Statistics.addStatistics('000027_mianbaoxie_home');
                            }else if( curLeft < 0 && curLeft > -this.maxLeft){
                                if(this.oToMore.find('a').hasClass('on')){
                                    this.oCrumbBg.css('left', "-" + this.maxLeft + 'px');
                                }else{
                                    this.oCrumbBg.css('left',0);
                                }
                             }
                    },
                    touchhandler:function(e){
                        switch (e.type) {
                            case 'touchstart':
                                this.startX = e.touches[0].clientX;
                                break;
                            case 'touchmove':
                                var stopX = e.touches[0].clientX;
                                var offsetX = stopX - this.startX;
                                var curLeft = parseInt(this.oCrumbBg.css('left'), 10);
                                var finLeft = offsetX + curLeft;
                                if( finLeft <= 0 && this.maxLeft>= 0 && finLeft >= -this.maxLeft){
                                    this.oCrumbBg.css('left',finLeft + 'px' );
                                    if (finLeft === 0){
                                        this.oToMore.find('a').removeClass('on');
                                    }
                                    if(finLeft == -this.maxLeft){
                                        this.oToMore.find('a').addClass('on');
                                    }
                                }

                                break;
                            case 'touchend':
                                break;
                        }
                    }

                }).init();


                //fin_weibo
                ({
                    init:function(){
                        this.moreBtn = $('.fin_weibo .cnt .more');
                        this.bindUI();

                    },
                    bindUI:function(){
                        var self = this;
                        self.moreBtn.one('click',function(e){
                            e.preventDefault();
                            $(this).closest('p').addClass('showMore_p');
                        });
                    }
                }).init();

            }
    };

     //发送返回首页的统计码
    var sendBackHomeStatis = function  () {
        // 监听回退按钮事件，如果上一个页面是首页的话，那么直接使用histroy.back()返回，节省网络资源,也可以回到历史位置
        var backHomeHandler = function (e){
            e.preventDefault();
            var a = document.createElement('a');
            a.href = document.referrer;
            var pathname = a.pathname, hostname = a.hostname;

            var now = new Date().getTime(),
                time = window.localStorage.getItem('msohu/recommend_final/back_timer') || now,
                tempTimer,
                prevHostName;

            if (time > now - (5 * 60 * 1000) && /^(([ab]|[td][1-9])\.)?m\.sohu\.com$/i.test(hostname) && (pathname === '/recommend/index')) {
                Statistics.addStatistics(baseStatisNum + '_backstream');
                tempTimer = setTimeout(function () {
                    tempTimer = null;
                   window.history.back();
                }, 100);
            } else {
                prevHostName = window.location.hostname;
                //兼容测试环境
                //最后的once码
                var trueOnceCode = baseStatisNum + '_backstream';
                if (/m\.sohu\.com$/.test(prevHostName)) {
                    window.location.href = 'http://' + prevHostName +'/recommend/index?_once_='+ trueOnceCode ;
                }else{
                    window.location.href = 'http://m.sohu.com/recommend/index?_once_='+ trueOnceCode ;
                }
                
            }
            window.localStorage.setItem('msohu/recommend_final/back_timer', now);
            a = null;
        };

        $('.h_min .logo_min a').on( 'click', backHomeHandler);
        $('.back-to-home .back-2-home a').on( 'click', backHomeHandler);

    };

        $(function(){
        //实例化新闻对象
        var news = new News(n_config);

        //正文页图片大图浏览
        App.addFeatures();
        
        //发送返回首页的统计码
        sendBackHomeStatis();

        //正文页内嵌视频初始化
        window.initSohuMobilePlayer();

    });
}

//微信分享
function share_to_qq (){
    //模拟统计点击，然后提交表单
    $.ajax({
        'url':'/sr/?redirect_url=http://ti.3g.qq.com/open/s?aid=share&_once_=000022_tengxun_sharetov3',
        'success': function(result) {
            share2qq.submit();
        },
        'error':function(){
            share2qq.submit();
        }
    });
}

window.share_to_qq = share_to_qq;

})(window);