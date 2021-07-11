/* global Vue, ELEMENT, moment, countlyCommon, _, CV */

(function(countlyVue) {

    var countlyBaseComponent = countlyVue.components.BaseComponent,
        _mixins = countlyVue.mixins;

    var availableShortcuts = {
        "yesterday": {
            label: countlyVue.i18n("common.yesterday"),
            value: "yesterday",
            getRange: function() {
                return [moment().startOf("day").subtract(1, "d"), moment().endOf("day").subtract(1, "d")];
            }
        },
        "hour": {
            label: countlyVue.i18n("common.today"),
            value: "hour",
            getRange: function() {
                return [moment().startOf("day"), moment().endOf("day")];
            }
        },
        "7days": {
            label: countlyVue.i18n("taskmanager.last-7days"),
            value: "7days",
            getRange: function() {
                return [moment().startOf("day").subtract(7, "d"), moment().endOf("day")];
            }
        },
        "30days": {
            label: countlyVue.i18n("taskmanager.last-30days"),
            value: "30days",
            getRange: function() {
                return [moment().startOf("day").subtract(30, "d"), moment().endOf("day")];
            }
        },
        "60days": {
            label: countlyVue.i18n("taskmanager.last-60days"),
            value: "60days",
            getRange: function() {
                return [moment().startOf("day").subtract(60, "d"), moment().endOf("day")];
            }
        },
        "day": {
            label: moment().format("MMMM, YYYY"),
            value: "day",
            getRange: function() {
                return [moment().startOf("month"), moment().endOf("month")];
            }
        },
        "month": {
            label: moment().year(),
            value: "month",
            getRange: function() {
                return [moment().startOf("year"), moment().endOf("year")];
            }
        },
        "0days": {
            label: countlyVue.i18n("common.all-time"),
            value: "0days",
            getRange: function() {
                return [moment([2010, 0, 1]), moment().endOf("year")];
            }
        }
    };

    /**
     * Provides picker with the default input state
     * @param {String} formatter Formatter string e.g. MM/DD/YYYY
     * @returns {Object} State object, can be merged to component data  
     */
    function getDefaultInputState(formatter) {
        var now = moment(),
            minDateMM = moment().subtract(1, 'month'),
            minDateText = minDateMM.format(formatter),
            minDate = minDateMM.toDate(),
            maxDateMM = now,
            maxDate = maxDateMM.toDate();

        var state = {
            // User input
            now: now,
            selectedShortcut: null,
            customRangeSelection: true,
            rangeMode: 'inBetween',
            minDate: minDate,
            maxDate: maxDate,
            inBetweenInput: {
                raw: {
                    textStart: minDateText,
                    textEnd: maxDateMM.format(formatter),
                },
                parsed: [minDate, maxDate]
            },
            sinceInput: {
                raw: {
                    text: minDateText,
                },
                parsed: [minDate, maxDate]
            },
            inTheLastInput: {
                raw: {
                    text: '1',
                    level: 'months'
                },
                parsed: [minDate, maxDate]
            },
        };
        state.label = getRangeLabel(state);
        return state;
    }

    var globalDaysRange = [],
        globalMonthsRange = [],
        globalMin = moment([2010, 0, 1]),
        globalMax = moment(),
        daysCursor = moment(globalMin.toDate()),
        monthsCursor = moment(globalMin.toDate()),
        globalMonthsCalendarIndex = {},
        globalDaysCalendarIndex = {},
        indexCursor = 1;

    while (daysCursor < globalMax) {
        globalDaysRange.push({
            date: daysCursor.toDate(),
            title: daysCursor.format("MMMM YYYY"),
            key: daysCursor.unix(),
            anchorClass: "anchor-" + daysCursor.unix(),
        });
        daysCursor = daysCursor.add(1, "M");
        globalDaysCalendarIndex[daysCursor.startOf("month").unix()] = indexCursor++;
    }

    indexCursor = 1;
    while (monthsCursor < globalMax) {
        globalMonthsRange.push({
            date: monthsCursor.toDate(),
            title: monthsCursor.format("YYYY"),
            key: monthsCursor.unix(),
            anchorClass: "anchor-" + monthsCursor.unix(),
        });
        monthsCursor = monthsCursor.add(1, "Y");
        globalMonthsCalendarIndex[monthsCursor.startOf("year").unix()] = indexCursor++;
    }

    Object.freeze(globalMonthsRange);
    Object.freeze(globalMonthsCalendarIndex);
    Object.freeze(globalDaysRange);
    Object.freeze(globalDaysCalendarIndex);

    /**
     * Creates an initial state object 
     * @param {Object} instance Instance configuration
     * @returns {Object} Initial state object for datepicker
     */
    function getInitialState(instance) {
        var formatter = null,
            tableType = "",
            globalRange = null,
            calendarIndex = {};

        if (instance.type === "monthrange") {
            formatter = "YYYY-MM";
            tableType = "month";
            globalRange = globalMonthsRange;
            calendarIndex = globalMonthsCalendarIndex;
        }
        else {
            formatter = "YYYY-MM-DD";
            tableType = "date";
            globalRange = globalDaysRange;
            calendarIndex = globalDaysCalendarIndex;
        }

        var state = {
            // Calendar state
            rangeState: {
                endDate: null,
                selecting: false,
                row: null,
                column: null,
                focusOn: null
            },

            rangeBackup: {
                minDate: null,
                maxDate: null
            },

            scrollOps: {
                scrollPanel: { scrollingX: false},
                bar: {minSize: 0.2, background: 'rgba(129,134,141,.3)'}
            },

            // Constants
            formatter: formatter,
            globalRange: globalRange,
            tableType: tableType,
            globalMin: globalMin,
            globalMax: globalMax,
            calendarIndex: calendarIndex
        };

        return _.extend(state, getDefaultInputState(formatter));
    }

    /**
     * Returns the range label for a given state object
     * @param {Object} state Current state of datepicker
     * @returns {String} Range label
     */
    function getRangeLabel(state) {

        if (!state.rangeMode || state.rangeMode === 'inBetween') {
            var effectiveRange = [moment(state.minDate), moment(state.maxDate)];
            if (effectiveRange[1] - effectiveRange[0] > 86400000) {
                return effectiveRange[0].format("ll") + " - " + effectiveRange[1].format("ll");
            }
            else {
                return effectiveRange[0].format("lll") + " - " + effectiveRange[1].format("lll");
            }
        }
        else if (state.rangeMode === 'since') {
            return CV.i18n('common.time-period-name.since', moment(state.minDate).format("ll"));
        }
        else if (state.rangeMode === 'inTheLast') {
            var num = parseInt(state.inTheLastInput.raw.text, 10),
                suffix = '';

            if (num > 1) {
                suffix = "-plural";
            }
            return CV.i18n('common.in-last-' + state.inTheLastInput.raw.level + suffix, num);
        }
    }

    var AbstractTableComponent = {
        props: {
            dateMeta: Object
        },
        components: {
            'el-date-table': ELEMENT.DateTable
        },
        template: '<div class="cly-vue-daterp__date-table-wrapper" :class="dateMeta.anchorClass">\
                        <span class="text-medium">{{ dateMeta.title }}</span>\
                        <table-component v-bind="$attrs" v-on="$listeners">\
                        </table-component>\
                    </div>',
    };

    var dateTableComponent = {
        components: {
            'table-component': ELEMENT.DateTable
        },
        mixins: [AbstractTableComponent]
    };

    var monthTableComponent = {
        components: {
            'table-component': ELEMENT.MonthTable
        },
        mixins: [AbstractTableComponent]
    };

    var InputControlsMixin = {
        methods: {
            tryParsing: function(newVal, target, index) {
                var parsedRange = target.parsed;
                var needsSync = newVal !== moment(parsedRange[index]).format(this.formatter);
                if (needsSync) {
                    var parsed = moment(newVal);
                    if (parsed && parsed.isValid() && (parsed >= this.globalMin) && (parsed <= this.globalMax)) {
                        target.raw['invalid' + index] = false;
                        parsedRange[index] = parsed.toDate();
                        this.handleUserInputUpdate(parsedRange[index]);
                    }
                    else {
                        target.raw['invalid' + index] = true;
                    }
                }
            },
            handleTextStartFocus: function() {
                this.scrollTo(this.inBetweenInput.parsed[0]);
            },
            handleTextEndFocus: function() {
                this.scrollTo(this.inBetweenInput.parsed[1]);
            },
            handleTextStartBlur: function() {
                if (this.inBetweenInput.raw.invalid0 && this.inBetweenInput.parsed[0]) {
                    this.inBetweenInput.raw.textStart = moment(this.inBetweenInput.parsed[0]).format(this.formatter);
                    this.inBetweenInput.raw.invalid0 = false;
                }
            },
            handleTextEndBlur: function() {
                if (this.inBetweenInput.raw.invalid1 && this.inBetweenInput.parsed[1]) {
                    this.inBetweenInput.raw.textEnd = moment(this.inBetweenInput.parsed[1]).format(this.formatter);
                    this.inBetweenInput.raw.invalid1 = false;
                }
            },
            handleSinceBlur: function() {
                if (this.sinceInput.raw.invalid0 && this.sinceInput.parsed[0]) {
                    this.sinceInput.raw.text = moment(this.sinceInput.parsed[0]).format(this.formatter);
                    this.sinceInput.raw.invalid0 = false;
                }
            },
            handleUserInputUpdate: function(scrollToDate) {
                var inputObj = null;

                switch (this.rangeMode) {
                case 'inBetween':
                    inputObj = this.inBetweenInput.parsed;
                    break;
                case 'since':
                    inputObj = this.sinceInput.parsed;
                    break;
                case 'inTheLast':
                    inputObj = this.inTheLastInput.parsed;
                    break;
                default:
                    return;
                }

                if (scrollToDate) {
                    this.scrollTo(scrollToDate);
                }
                else if (inputObj[0]) {
                    this.scrollTo(inputObj[0]);
                }

                if (inputObj && inputObj[0] && inputObj[1] && inputObj[0] <= inputObj[1]) {
                    this.minDate = inputObj[0];
                    this.maxDate = inputObj[1];
                }
            },
            setCurrentInBetween: function(minDate, maxDate) {
                this.inBetweenInput = {
                    raw: {
                        textStart: moment(minDate).format(this.formatter),
                        textEnd: moment(maxDate).format(this.formatter)
                    },
                    parsed: [minDate, maxDate]
                };
            }
        },
        watch: {
            'inBetweenInput.raw.textStart': function(newVal) {
                this.tryParsing(newVal, this.inBetweenInput, 0);
            },
            'inBetweenInput.raw.textEnd': function(newVal) {
                this.tryParsing(newVal, this.inBetweenInput, 1);
            },
            'sinceInput.raw.text': function(newVal) {
                this.tryParsing(newVal, this.sinceInput, 0);
            },
            'inTheLastInput.raw': {
                deep: true,
                handler: function(newVal) {
                    var parsed = moment().subtract(newVal.text, newVal.level).startOf("day");
                    if (!parsed.isSame(moment(this.inTheLastInput.parsed[0]))) {
                        if (parsed && parsed.isValid()) {
                            this.inTheLastInput.parsed[0] = parsed.toDate();
                            this.handleUserInputUpdate(this.inTheLastInput.parsed[0]);
                        }
                    }
                }
            },
        }
    };

    var CalendarsMixin = {
        methods: {
            disabledDateFn: function(date) {
                return date > this.globalMax || date < this.globalMin;
            },
            handleRangePick: function(val) {
                this.rangeMode = "inBetween";
                var firstClick = !this.rangeState.selecting;
                if (firstClick) {
                    this.rangeBackup = {
                        minDate: this.minDate,
                        maxDate: this.maxDate
                    };
                }
                var minDate, maxDate;
                if (firstClick) {
                    if (this.tableType === "date") {
                        minDate = moment(val.minDate).startOf("day").toDate();
                        maxDate = moment(val.minDate).endOf("day").toDate();
                    }
                    else {
                        minDate = moment(val.minDate).startOf("month").toDate();
                        maxDate = moment(val.minDate).endOf("month").toDate();
                    }

                    this.setCurrentInBetween(minDate, maxDate);
                }
                else {
                    if (this.tableType === "date") {
                        minDate = moment(val.minDate).startOf("day").toDate();
                        maxDate = moment(val.maxDate).endOf("day").toDate();
                    }
                    else {
                        minDate = moment(val.minDate).startOf("month").toDate();
                        maxDate = moment(val.maxDate).endOf("month").toDate();
                    }
                }

                if (this.maxDate === maxDate && this.minDate === minDate) {
                    return;
                }
                this.onPick && this.onPick(val);
                this.minDate = minDate;
                this.maxDate = maxDate;
            },
            handleChangeRange: function(val) {
                this.minDate = val.minDate;
                this.maxDate = val.maxDate;
                this.rangeState = val.rangeState;

                var startsAt, endsAt;

                if (this.minDate <= this.rangeState.endDate) {
                    startsAt = this.minDate;
                    endsAt = this.rangeState.endDate;
                    this.rangeState.focusOn = "end";
                }
                else {
                    startsAt = this.rangeState.endDate;
                    endsAt = this.minDate;
                    this.rangeState.focusOn = "start";
                }

                this.setCurrentInBetween(startsAt, endsAt);
            },
            scrollTo: function(date) {
                if (!this.customRangeSelection) {
                    return;
                }
                var anchorClass = null;
                if (this.tableType === "month") {
                    anchorClass = moment(date).startOf("year").unix();
                }
                else {
                    anchorClass = moment(date).startOf("month").unix();
                }

                this.$refs.scroller.scrollToItem(this.calendarIndex[anchorClass]);
            },
            abortPicking: function() {
                if (this.rangeState.selecting) {
                    this.rangeState = {
                        endDate: null,
                        selecting: false,
                        row: null,
                        column: null,
                        focusOn: null
                    };
                    this.minDate = this.rangeBackup.minDate;
                    this.maxDate = this.rangeBackup.maxDate;
                    this.rangeBackup = {
                        minDate: null,
                        maxDate: null
                    };
                    this.setCurrentInBetween(this.minDate, this.maxDate);
                }
            },
        }
    };

    Vue.component("cly-date-picker", countlyVue.components.create({
        mixins: [
            _mixins.i18n,
            InputControlsMixin,
            CalendarsMixin
        ],
        components: {
            'date-table': dateTableComponent,
            'month-table': monthTableComponent
        },
        computed: {
            isStartFocused: function() {
                return this.rangeState.selecting && this.rangeState.focusOn === "start";
            },
            isEndFocused: function() {
                return this.rangeState.selecting && this.rangeState.focusOn === "end";
            },
            shortcuts: function() {
                if (this.type === "daterange" && this.displayShortcuts) {
                    var self = this;
                    return Object.keys(availableShortcuts).reduce(function(acc, shortcutKey) {
                        if (self.enabledShortcuts === false && self.disabledShortcuts === false) {
                            acc.push(availableShortcuts[shortcutKey]);
                        }
                        else if (self.enabledShortcuts !== false) {
                            if (self.enabledShortcuts.indexOf(shortcutKey) !== -1) {
                                acc.push(availableShortcuts[shortcutKey]);
                            }
                        }
                        else if (self.disabledShortcuts !== false) {
                            if (self.disabledShortcuts.indexOf(shortcutKey) === -1) {
                                acc.push(availableShortcuts[shortcutKey]);
                            }
                        }
                        return acc;
                    }, []);
                }
                return [];
            }
        },
        props: {
            value: [Object, String, Array],
            type: {
                type: String,
                default: "daterange",
                validator: function(value) {
                    return ['daterange', 'monthrange'].indexOf(value) !== -1;
                }
            },
            displayShortcuts: {
                type: Boolean,
                default: true
            },
            disabledShortcuts: {
                type: [Array, Boolean],
                default: false
            },
            enabledShortcuts: {
                type: [Array, Boolean],
                default: false
            },
            placeholder: {type: String, default: 'Select'},
            disabled: { type: Boolean, default: false},
            size: {type: String, default: 'small'},
            showRelativeModes: {type: Boolean, default: true },
            offsetCorrection: {type: Boolean, default: true},
            modelMode: {
                type: String,
                default: "mixed",
                validator: function(value) {
                    return ['mixed', 'absolute'].indexOf(value) !== -1;
                }
            },
            timestampFormat: {
                type: String,
                default: 's',
                validator: function(value) {
                    return ['s', 'ms'].indexOf(value) !== -1;
                }
            },
            placement: {
                type: String,
                default: 'bottom-start'
            }
        },
        data: function() {
            return getInitialState(this);
        },
        watch: {
            'value': {
                immediate: true,
                handler: function(newVal) {
                    this.loadValue(newVal);
                }
            },
            'type': function() {
                /*
                    Type change causes almost everything to change.
                    So we simply reinitialize the component.
                */
                Object.assign(this.$data, getInitialState(this));
                this.loadValue(this.value);
            }
        },
        methods: {
            loadValue: function(value) {
                var changes = this.valueToInputState(value),
                    self = this;

                changes.label = getRangeLabel(changes);

                Object.keys(changes).forEach(function(fieldKey) {
                    self[fieldKey] = changes[fieldKey];
                });
            },
            valueToInputState: function(value) {

                var isShortcut = this.shortcuts && this.shortcuts.some(function(shortcut) {
                    return shortcut.value === value;
                });

                if (isShortcut) {
                    var shortcutRange = availableShortcuts[value].getRange();
                    return {
                        minDate: shortcutRange[0].toDate(),
                        maxDate: shortcutRange[1].toDate(),
                        selectedShortcut: value,
                        customRangeSelection: false
                    };
                }

                var meta = countlyCommon.convertToTimePeriodObj(value),
                    now = moment().toDate(),
                    state = {
                        selectedShortcut: null,
                        customRangeSelection: true
                    };

                if (meta.type === "range") {
                    state.rangeMode = 'inBetween';
                    state.minDate = new Date(this.fixTimestamp(meta.value[0], "input"));
                    state.maxDate = new Date(this.fixTimestamp(meta.value[1], "input"));
                    state.inBetweenInput = {
                        raw: {
                            textStart: moment(state.minDate).format(this.formatter),
                            textEnd: moment(state.maxDate).format(this.formatter)
                        },
                        parsed: [state.minDate, state.maxDate]
                    };
                }
                else if (meta.type === "since") {
                    state.rangeMode = 'since';
                    state.minDate = new Date(this.fixTimestamp(meta.value.since, "input"));
                    state.maxDate = now;
                    state.sinceInput = {
                        raw: {
                            text: moment(state.minDate).format(this.formatter),
                        },
                        parsed: [state.minDate, state.maxDate]
                    };
                }
                else if (meta.type === "last-n") {
                    state.rangeMode = 'inTheLast';
                    state.minDate = moment().subtract(meta.value, meta.level).startOf("day").toDate();
                    state.maxDate = now;
                    state.inTheLastInput = {
                        raw: {
                            text: meta.value + '',
                            level: meta.level
                        },
                        parsed: [state.minDate, state.maxDate]
                    };
                }
                else if (availableShortcuts[value]) {
                    /*
                        Shortcuts values should be mapped to a real date range for the cases shortcuts are disabled. 
                    */
                    var effectiveShortcutRange = availableShortcuts[value].getRange();
                    state.rangeMode = 'inBetween';
                    state.minDate = effectiveShortcutRange[0].toDate();
                    state.maxDate = effectiveShortcutRange[1].toDate();
                    state.inBetweenInput = {
                        raw: {
                            textStart: effectiveShortcutRange[0].format(this.formatter),
                            textEnd: effectiveShortcutRange[1].format(this.formatter)
                        },
                        parsed: [state.minDate, state.maxDate]
                    };
                }
                return state;
            },
            handleDropdownHide: function(aborted) {
                this.abortPicking();
                if (aborted) {
                    this.loadValue(this.value);
                }
            },
            handleDropdownShow: function() {
                var self = this;
                this.$forceUpdate();
                this.$nextTick(function() {
                    self.scrollTo(self.minDate);
                });
            },
            handleCustomRangeClick: function() {
                this.customRangeSelection = true;
                var self = this;
                this.$nextTick(function() {
                    self.$forceUpdate();
                    self.scrollTo(self.minDate);
                });
            },
            handleShortcutClick: function(value) {
                this.selectedShortcut = value;
                if (value) {
                    this.doCommit(value, true);
                }
            },
            handleTabChange: function() {
                this.abortPicking();
                this.handleUserInputUpdate();
            },
            fixTimestamp: function(value, mode) {
                if (!this.offsetCorrection && this.timestampFormat === "ms") {
                    return value;
                }

                var newValue = value;

                if (this.timestampFormat === "s") {
                    if (mode === "output") {
                        newValue = Math.floor(value / 1000);
                    }
                    else { // mode === "input"
                        newValue = value * 1000;
                    }
                }

                if (this.offsetCorrection) {
                    if (mode === "output") {
                        newValue = newValue - countlyCommon.getOffsetCorrectionForTimestamp(newValue);
                    }
                    else { // mode === "input" 
                        newValue = newValue + countlyCommon.getOffsetCorrectionForTimestamp(newValue);
                    }
                }
                return newValue;
            },
            handleConfirmClick: function() {
                if (this.rangeMode === 'inBetween' || this.modelMode === "absolute") {
                    this.doCommit([
                        this.fixTimestamp(this.minDate.valueOf(), "output"),
                        this.fixTimestamp(this.maxDate.valueOf(), "output")
                    ], false);
                }
                else if (this.rangeMode === 'since') {
                    this.doCommit({ since: this.fixTimestamp(this.minDate.valueOf(), "output") }, false);
                }
                else if (this.rangeMode === 'inTheLast') {
                    this.doCommit(this.inTheLastInput.raw.text + this.inTheLastInput.raw.level, false);
                }
            },
            handleDiscardClick: function() {
                this.doDiscard();
            },
            doClose: function() {
                this.$refs.dropdown.handleClose();
            },
            doDiscard: function() {
                this.doClose();
            },
            doCommit: function(value, isShortcut) {
                if (value) {
                    this.$emit("input", value);
                    this.$emit("change", {
                        effectiveRange: [
                            this.fixTimestamp(this.minDate.valueOf(), "output"),
                            this.fixTimestamp(this.maxDate.valueOf(), "output")
                        ],
                        isShortcut: isShortcut,
                        value: value
                    });
                    this.doClose();
                }
            }
        },
        template: CV.T('/javascripts/countly/vue/templates/datepicker.html')
    }));

    var globalDatepicker = countlyBaseComponent.extend({
        computed: {
            globalDate:
            {
                get: function() {
                    return this.$store.getters["countlyCommon/period"];
                },
                set: function(newVal) {
                    countlyCommon.setPeriod(newVal);
                }
            }
        },
        methods: {
            onChange: function() {
                this.$root.$emit("cly-date-change");
            }
        },
        template: '<cly-date-picker timestampFormat="ms" :disabled-shortcuts="[\'0days\']" modelMode="absolute" v-model="globalDate" @change="onChange"></cly-date-picker>'
    });

    Vue.component("cly-date-picker-g", globalDatepicker);

    /*
        Remove the following component.
        Its only used by
        - surveys
        - cly-panel (deprecated)
    */
    Vue.component("cly-global-date-selector-w", globalDatepicker);

}(window.countlyVue = window.countlyVue || {}));
