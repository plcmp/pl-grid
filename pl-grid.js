import { PlElement, html, css } from "polylib";

import '@plcmp/pl-virtual-scroll';

import "@plcmp/pl-icon";
import "@plcmp/pl-iconset-default";

import {PlaceHolder, PlResizeableMixin } from '@plcmp/utils';

import "./pl-grid-column.js";
import {normalizePath} from "polylib/common.js";
import { throttle } from "@plcmp/utils";

class PlGrid extends PlResizeableMixin(PlElement) {
    static get properties() {
        return {
            data: { type: Array, value: () => [], observer: '_dataObserver' },
            selected: { type: Object, value: () => null, observer: '_selectedObserver' },
            tree: { type: Boolean, observer: '_treeModeChange' },
            partialData: { type: Boolean,  observer: '_treeModeChange' },
            _vdata: { type: Array, value: () => [], observer: '_vdataObserver' },
            _columns: { type: Array, value: () => [] },
            keyField: { type: String },
            pkeyField: { type: String },
            hasChildField: { type: String, value: '_haschildren' }
        }
    }

    static get css() {
        return css`
            :host {
				width: 100%;
                height: 100%;
                border: 1px solid var(--grey-light);
                border-radius: var(--border-radius);
                display: flex;
                flex-direction: column;
                position: relative;
                box-sizing: border-box;
                --pl-grid-cell-min-height: var(--base-size-lg);
                --pl-grid-header-min-height: var(--base-size-lg);
                --pl-grid-active-color: var(--primary-lightest);
                --pl-grid-active-text-color: var(--text-color);
            }

            #container {
				width: 100%;
                height: 100%;
                overflow: auto;
                contain: strict;
                position: relative;
            }

            #headerContainer{
                display: flex;
				width: 100%;
				position: sticky;
                background-color: var(--grey-lightest);
				z-index: 1;
				top: 0;
            }

            #header{
                display: flex;
                border-bottom: 1px solid var(--grey-light);
                position: sticky;
                top: 0;
                flex: 1;
                will-change: width;
            }

            .headerEl[fixed], 
            .headerEl[action]  {
                position: sticky;
                z-index: 3;
            }

            .headerEl[action] {
                right: 0;
            }
            
            .headerEl[hidden] {
                display: none;
            }

            #rowsContainer {
                height: 100%;
                width: 100%;
                position: relative;
                display: flex;
                flex-direction: column;
				width: 100%;
            }

            .row {
                display: flex;
                flex-direction: row;
                border-top: 1px solid transparent;
                border-bottom: 1px solid var(--grey-light);
                background-color: var(--background-color);
                width: 100%;
                flex-shrink: 0;
                box-sizing: border-box;
            }

            .cell{
                display: flex;
                padding: var(--space-xs) var(--space-sm); 
                align-items: center;
                height: var(--pl-grid-cell-min-height);
                color: var(--text-color);
                overflow: hidden;
                background-color: inherit;
                will-change: width;
                position: sticky;
                box-sizing: border-box;
                flex-shrink: 0;
                white-space: nowrap;
            }

            .cell[fixed] {
                position: sticky;
                border-right: 1px solid var(--grey-light);
                background-color: var(--grey-lightest);
                z-index:1;
            }

            .cell[action] {
                position: sticky;
                right: 0;
                border-left: 1px solid var(--grey-light);
                background-color: var(--grey-lightest);
                z-index:1;
            }

            .cell[hidden] {
                display: none;
            }

            .row:hover, 
            .row:hover .cell,
            .row[active], 
            .row[active] .cell{
                white-space: normal;
                background-color: var(--pl-grid-active-color);
                color: var(--pl-grid-active-text-color);
                --pl-icon-fill-color: var(--pl-grid-active-text-color);
            }

            .tree-cell {
                cursor: pointer;
                width: var(--base-size-xs);
                user-select: none;
            }

            .cell-content {
                width: 100%;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                background-color: inherit;
            }

            .top-toolbar ::slotted(*) {
                width: 100%;
                padding: var(--space-sm);
                box-sizing: border-box;
                border-bottom: 1px solid var(--grey-light);

            }

            .bottom-toolbar ::slotted(*) {
                border-top: 1px solid var(--grey-light);
                width: 100%;
                padding: var(--space-sm);
                box-sizing: border-box;
            }

            pl-virtual-scroll {
                display: none;
            }
		`;
    }

    static get template() {
        return html`
            <div class="top-toolbar">
                <slot name="top-toolbar"></slot>
            </div>
            <div id="container">
                <div id="headerContainer">
                    <div id="header">
                        <template d:repeat="[[_columns]]" d:as="column">
                            <div class="headerEl" hidden$=[[column.hidden]] fixed$=[[column.fixed]] action$="[[column.action]]" style$="[[_getCellStyle(column.index, column.width)]]">
                                <slot name="[[_getSlotName(column.index)]]"></slot>
                            </div>
                        </template>
                    </div>
                </div>
                <div id="rowsContainer">
                    <pl-virtual-scroll canvas="[[$.rowsContainer]]" items="{{_vdata}}" as="row" id="scroller">
                        <template id="tplRow">
                            <div class="row" active$="[[_isRowActive(row, selected)]]" on-click="[[_onRowClick]]" on-dblclick="[[_onRowDblClick]]">
                                <template id="tplCol" d:repeat="[[_columns]]" d:as="column" id="cell-repeater">
                                    <div style$="[[_getCellStyle(column.index, column.width)]]" class="cell" hidden$="[[column.hidden]]" fixed$="[[column.fixed]]" action$="[[column.action]]">
                                        <span class="tree-cell" style=[[_getRowPadding(row,column.index)]]" on-click="[[_onTreeNodeClick]]">
                                            [[_getTreeIcon(row)]]
                                        </span>
                                        <span class="cell-content">[[column.cellTemplate]]</span>
                                    </div>
                                </template>
                            </div>
                        </template>
                    </pl-virtual-scroll>
                </div>
            </div>
            <div class="bottom-toolbar">
                <slot name="bottom-toolbar"></slot>
            </div>
        `;
    }

    connectedCallback() {
        super.connectedCallback();
        setTimeout(() => {
            if (this.data?.control) {
                this.data.control.partialData = this.partialData;
                if (this.data.control.treeMode && this.pkeyField) {
                    this.data.control.treeMode.hidField = this.pkeyField;
                    this.data.control.treeMode.keyField = this.keyField;
                }
            }
            }, 0);

        this.addEventListener('column-attribute-change', this.onColumnAttributeChange);
        
        const resizeObserver = new ResizeObserver(entries => {
            let throttler = throttle(() => {
                this.reactToResize();
            }, 100)

            throttler();
        });

        requestAnimationFrame(() => {
            this._init();
        })

        resizeObserver.observe(this.$.headerContainer);

        const observer = new MutationObserver((mutationsList, observer) => {
            for (let mutation of mutationsList) {
                if (mutation.type === 'childList') {
                    this._init();
                }
        }});

        observer.observe(this, { attributes: false, childList: true, subtree: true });
    }

    _dataObserver(val, _old, mutation) {
        if (!mutation || (mutation.path === 'data' && mutation.action === 'upd')) {
            if (this.tree) {
                this.set('_vdata', this.buildTree(this.keyField, this.pkeyField, this.hasChildField));
            } else {
                this.set('_vdata', val);
            }
        } else {
            if (mutation.path === 'data.load') {
                if (this.data !== this._vdata) { this._vdata.load = this.data.load }
            }

            if(mutation.path === 'data.sorts') {
                return
            }
            //TODO: fix mutation translate for tree
            if (this.tree) {
                this.applyTreeMutation(mutation);
            } else {
                //TODO: path can be array
                let translatedPath = mutation.path.replace('data', '_vdata');
                // translate mutation with resenting watermark,
                // we need to new mutation cycle for apply nested change
                mutation = { ...mutation, path: translatedPath };
                this.notifyChange(mutation);
            }
        }
    }

    onColumnAttributeChange(event) {
        const { index, attribute, value } = event.detail;
        if (attribute === 'width') {
            this._changeColumnWidth(this._columns[index], value);
        }

        if (attribute === 'sort') {
            this._changeColumnSort(this._columns[index], value)
        }
    }

    reactToResize() {
        this.$.scroller.render();
        this.$.rowsContainer.style.width = this.$.headerContainer.scrollWidth + 'px';
    }

    _init() {
        const columnsNodes = Array.prototype.slice.call(this.querySelectorAll('pl-grid-column'));
        const _columns = columnsNodes.map((column, index) => {
            column.setAttribute('slot', `column-${index}`);
            const info = {
                kind: column.kind,
                header: column.header,
                hidden: column.hidden || false,
                field: column.field,
                width: column.width ? parseInt(column.width) : null,
                resizable: column.resizable,
                fixed: column.fixed || false,
                action: column.action || false,
                index: index,
                cellTemplate: column._cellTemplate
            };

            column._index = index;
            return info;
        });

        this._columns = _columns;
        this.reactToResize();
    }

    _isRowActive(row, selected) {
        return row == selected;
    }


    _changeColumnSort(column, sort) {
        let sorts = this.data.sorts || [];
        const ind = sorts.findIndex(item => item.field == column.field);
        if (ind >= 0) {
            sorts.splice(ind, 1);
        }

        let newSort = {
            field: column.field,
            sort: sort
        };

        sorts.splice(0, 0, newSort);
        this.set('data.sorts', sorts);
    }

    _changeColumnWidth(column, width) {
        this.set(`_columns.${column.index}.width`, width);
        this.reactToResize();
    }

    _getSlotName(index) {
        return `column-${index}`;
    }

    _getCellStyle(index) {
        const column = this._columns[index];
        const style = [];

        if (!column) {
            return '';
        }

        if (column.width) {
            style.push(`width: ${column.width}px`);
        } else {
            style.push(`flex: 1;`);
        }

        if (column.fixed) {
            const left = column.index == 0 ? '0' : this._ti._pti ? this._ti._pti.ctx._columns[column.index - 1].width + 'px' : this._ti.ctx._columns[column.index - 1].width + 'px';
            style.push(`left: ${left}`);
        }

        return style.join(';');
    }

    _onRowClick(event) {
        if (event.model.row) {
            this.selected = event.model.row;
        }

        this.dispatchEvent(new CustomEvent('rowClick', { detail: { model: this.selected } }))
    }

    _onRowDblClick(event) {
        const ev = new CustomEvent('rowDblclick');
        ev.model = event.model;
        ev.originalEvent = event;
        this.dispatchEvent(ev);

        if (this.tree) {
            this._onTreeNodeClick(event);
        }
    }

    _onTreeNodeClick(event) {
        event.stopPropagation();
        if (event.model.row._haschildren === false) {
            return;
        }
        let idx = this._vdata.indexOf(event.model.row);
        this.set(`_vdata.${idx}._opened`, !event.model.row._opened);
        if (event.model.row._opened) {
            this.showChildren(event.model.row);
        } else {
            this.hideChildren(event.model.row);
        }
    }

    showChildren(item) {
        let it = item;

        const pendingShow = [];
        const vindex = this._vdata.indexOf(it);
        const addData = this.data.filter((i, c) => {
            if (i[this.pkeyField] == it[this.keyField]) {
                i._level = it._level + 1;
                if (i._opened) pendingShow.push(i);
                i._pitem = it;
                return true;
            }
        });

        if (addData.length > 0) {
            this.splice('_vdata', vindex + 1, 0, ...addData);
            it._childrenCount = addData.length;
            while (it._pitem) {
                it._pitem._childrenCount += item._childrenCount;
                it = it._pitem;
            }
            pendingShow.forEach(i => this.showChildren(i));
        } else if (this.partialData){
            // if no rows found with partial load for tree, add lazy load placeholder
            this.push('data', new PlaceHolder({ [this.pkeyField] :it[this.keyField], hid: it[this.keyField], _haschildren: false}));
        }
    }

    hideChildren(item) {
        let it = item;
        const vindex = this._vdata.indexOf(it);
        this.splice('_vdata', vindex + 1, it._childrenCount);
        while (it._pitem) {
            it._pitem._childrenCount -= it._childrenCount;
            it = it._pitem;
        }
        item._childrenCount = null;
    }

    _getRowPadding(row, index) {
        if (index == 0 && (this.tree)) {
            return `padding-left: ${row._level * 16 + 'px'}`;
        }
        return 'display:none;';
    }

    _getTreeIcon(row) {
        if (!row._haschildren) {
            return '';
        }

        return row._opened ? '-' : '+';
    }
    _vdataObserver(val, old, mutation) {
        if (mutation && mutation.path !== '_vdata') {
            let path = normalizePath(mutation.path);
            path[0] = 'data';
            path[1] = this.data.indexOf(this._vdata[path[1]]);
            this.dispatchEvent(new CustomEvent('data-changed', { detail: { ...mutation, path: path.join('.') } }));
        }
    }
    _selectedObserver(val) {
        if (!val) {
            return;
        }
        const parents = [];
        if (this.tree && !val._opened) {
            while (val.parent != null) {
                val = val.parent;
                parents.push(val);
            }

            parents.reverse().forEach((el) => {
                if (!el._opened) {
                    const idx = this._vdata.indexOf(el);
                    this.set(`_vdata.${idx}._opened`, true);
                    this.showChildren(el);
                }
            })
        }
    }

    _treeModeChange() {
        if (this.data.control && this.tree && this.partialData) {
            this.data.control.treeMode = {
                hidValue: undefined,
                keyField: this.keyField,
                hidField: this.pkeyField
            };
        } else if (this.data.control) {
            delete this.data.control.treeMode;
        }
    }

    buildTree(key, pkey, hasChild) {
        const pKeys = new Set();
        if (!this.partialData) {
            this.data.forEach(e => { pKeys.add(e[pkey]); });
        }
        let vData = this.data.filter((i, c) => {
            i._index = c;
            i._childrenCount = null;
            i._haschildren = hasChild && this.partialData ? i[hasChild] ?? true : pKeys.has(i[key]);
            if (i[pkey] == null) {
                i._level = 0;
                return true;
            }
        });
        vData.load = this.data.load
        return vData;
    }

    /**
     * Apply data splice mutation to tree in virtual data
     * @param {DataMutation} m
     */
    applyTreeMutation(m) {
        function indexesToRanges(arr) {
            return arr.sort((a, b) => a - b).reduce((a, i) => {
                if (a[0]?.end === i - 1) {
                    a[0].end = i;
                } else {
                    a.unshift({ start: i, end: i });
                }
                return a;
            }, []).reverse();
        }
        /*
        action: "splice"
        added: (411) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, …]
        addedCount: 411
        deleted: ControlledArray [filters: Array(0), sorts: Array(0), control: {…}]
        deletedCount: 0
        index: 0
        path: "data"
        target: ControlledArray(411) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, …]
        wmh: 99
         */
        if (m.path === 'data' && m.action === 'splice') {
            // delete
            if (m.deletedCount > 0) {
                let di = m.deleted.map(i => this._vdata.indexOf(i)).filter(i => i >= 0);
                let delRanges = indexesToRanges(di);
                delRanges.forEach(rr => this.splice('_vdata', rr.start, rr.end - rr.start + 1));
            }
            // add
            // Обновляем индексы
            this.data.forEach((e, i) => {
                e._index = i;
            });
            // Вставляем в нужные места добавленные элементы
            if (m.addedCount > 0) {
                for (let i = m.index; i < (m.index + m.addedCount); i++) {
                    const item = this.data[i];
                    // проверяем, возможно для добаввленного элемента уже есть дочерние
                    item._haschildren = this.hasChildField && this.partialData ? item[this.hasChildField] ?? true : this.data.some(i => i[this.pkeyField] == item[this.keyField]);
                    let pIndex;
                    let parentItem;
                    // Если вставляемая запись не имеет ссылки на родителя, добавляем к корням
                    if (!item[this.pkeyField]) {
                        pIndex = -1;
                        parentItem = {
                            code: null, _level: -1, _opened: true, [this.keyField]: item[this.pkeyField]
                        };
                    } else {
                        // Ищем родителя для вставки
                        pIndex = this._vdata.findIndex(vi => vi[this.keyField] == item[this.pkeyField]);
                        if (pIndex >= 0) {
                            parentItem = this._vdata[pIndex];
                            if (!parentItem._haschildren) this.set(['_vdata', pIndex, '_haschildren'], true);
                        }
                    }
                    // Если родитель нашелся и он раскрыт, ищем куда в нем вставлять
                    if (pIndex >= 0 || !item[this.pkeyField]) {
                        if (parentItem._opened) {
                            // Ищем потомка с индексом больше чем у того что нужно вставить,
                            // либо до конца текущего узла (если добавлять в конец)
                            // и вставляем элемент в найденную позицию

                            item._level = parentItem._level + 1;
                            // item.__haschildren = this.hasChildField ? item[this.hasChildField] : false;
                            item._pitem = parentItem;
                            ////if (this.dataMode == 'tree' && item.__haschildren) item.__needLoad = true;
                            let insertIndex = pIndex + 1;
                            while (this._vdata.length > insertIndex && this._vdata[insertIndex]._level > parentItem._level) {
                                if (this._vdata[insertIndex][this.pkeyField] == parentItem[this.keyField] && this._vdata[insertIndex]._index > item._index) {
                                    // нашли потомка с большим индексом
                                    break;
                                }
                                insertIndex++;
                            }

                            parentItem._childrenCount = (parentItem._childrenCount || 0) + 1;
                            let it = parentItem;
                            while (it._pitem) {
                                it._pitem._childrenCount += 1;
                                it = it._pitem;
                            }
                            this.splice('_vdata', insertIndex, 0, item);
                        }
                    }
                }
            }
        } else {
            // translate mutation from 'data' to 'vdata'
            let path = normalizePath(m.path);
            path[0] = '_vdata';
            path[1] = this._vdata.indexOf(this.data[path[1]]);
            if (path[1] >=0) {
                this.notifyChange({...m, path: path.join('.')});
            }
        }
    }
}

customElements.define('pl-grid', PlGrid);
