/*
Copyright (c) 2012 Stephen Heuer

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/
var CreditCardReader = Class.create({
  initialize: function(options) {
    if (!options) {
      options = {};
    }

    this.error_start = options.error_start || "é";
    this.track_start = options.track_start || "%";
    this.track_end = options.track_end || "?";
    this.track_end_alternate = options.track_end_alternate || "_";
    this.timeout = options.timeout || 100;

    this.error_start = this.error_start.charCodeAt(0);
    this.track_start = this.track_start.charCodeAt(0);
    this.track_end = this.track_end.charCodeAt(0);
    this.track_end_alternate = this.track_end_alternate.charCodeAt(0);

    this.started = false;
    this.finished = false;
    this.isError = false;
    this.input = "";
    this.timer = undefined;
    this.callbacks = [];
    this.errbacks = [];
    this.validators = [];
    this.isDispatching = false;
  },

  dispatch: function (data, isError) {
    isError = (data.substring(0,3) == "E!!" || isError);
    if (!isError) {
      isError = this.validators.any(function(vcb) { !vcb(this)}.bind(data));
    }

    if (this.isDispatching) {
      if (isError) {
        if (console)
          console.log("Immediate error!");
        return;
      } else {
        clearTimeout(this.isDispatching);
      }
    }

    reader = this;

    this.isDispatching = setTimeout(function () {
      if (console)
        console.log("Error timeout cleared");
      reader.isDispatching = false;
    }, 200);

    if (isError) {
      this.errbacks.each(function(cb) { cb(this)}.bind(this.input));
    } else {
      this.callbacks.each(function(cb) { cb(this)}.bind(this._parse_valid_data(this.input)));
    }
  },

  readObserver: function (e) {
    var keyCode = e.which || e.keyCode;
    if (!this.started && (keyCode === this.track_start || keyCode === this.error_start)) {
      e.stopPropagation();
      e.preventDefault();

      this.started = true;
      this.isError = keyCode === this.error_start;

      this.timer = setTimeout(function () {
        this.started = false;
        this.finished = false;
        this.isError = false;
        this.input = "";
      }.bind(this), this.timeout);
    } else if (this.started && (keyCode === this.track_end || keyCode === this.track_end_alternate)) {
      e.stopPropagation();
      e.preventDefault();

      this.finished = true;

      clearTimeout(this.timer);
      this.timer = setTimeout(function () {
        this.started = false;
        this.finished = false;
        this.isError = false;
        this.input = "";
      }.bind(this), this.timeout);
    } else if (this.started && this.finished && keyCode === 13) {
      e.stopPropagation();
      e.preventDefault();

      this.dispatch(this.input, this.isError);

      this.started = false;
      this.finished = false;
      this.isError = false;
      this.input = "";

      clearTimeout(this.timer);

    } else if (this.started) {
      e.stopPropagation();
      e.preventDefault();

      this.input += String.fromCharCode(keyCode);
      clearTimeout(this.timer);
      this.timer = setTimeout(function () {
        this.started = false;
        this.finished = false;
        this.isError = false;
        this.input = "";
      }.bind(this), this.timeout);
    }
  },

  observe: function (element) {
    new Event.observe($(element), 'keypress', this.readObserver.bind(this));
  },

  validate: function (validator) {
    this.validators.push(validator);
  },

  cardRead: function (callback) {
    this.callbacks.push(callback);
  },

  cardError: function (errback) {
    this.errbacks.push(errback);
  },

  _parse_valid_data: function(str) {
    data = str.split("^");
    number = data[0].match(/\d+/);
    name = data[1].strip().split("/").reverse().join(" ");
    exp_year = parseInt(data[2].substring(0,2), 10);
    exp_month = parseInt(data[2].substring(2,4), 10);

    return {number:number,name:name,exp_date:{year:exp_year,month:exp_month}};
  }
});
