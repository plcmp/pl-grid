import { PlElement, html, css } from "polylib";

import '@plcmp/pl-repeat';
import '@plcmp/pl-virtual-scroll';

import "@plcmp/pl-icon";
import "@plcmp/pl-iconset-default";

import { PlResizeableMixin } from '@plcmp/utils';

import "./pl-grid-column.js";

class PlGrid extends PlResizeableMixin(PlElement) {
    static get properties() {
        return {
            data: { type: Array, value: () => [], observer: '_dataObserver' },
            selected: { type: Object, value: () => null, observer: '_selectedObserver' },
            noFit: { type: Boolean, reflectToAttribute: true },
            tree: { type: Boolean, observer: '_treeModeChange' },
            partialData: { type: Boolean },
            _expandTemplate: { type: Object },
            _vdata: { type: Array, value: () => [], observer: '_vdataObserver' },
            _columns: { type: Array, value: () => [] },
            keyField: { type: String },
            pkeyField: { type: String },
            hasChildField: { type: String }
        }
    }

    static get css() {
        return css`
            :host {
				width: 100%;
                height: 100%;
                border: 1px solid var(--grey-light);
                font: var(--font-sm);
                display: flex;
                flex-direction: column;
                position: relative;
                box-sizing: border-box;
                --pl-grid-cell-min-height: 40px;
            }

            :host([no-fit]) {
                height: auto;
            }

            :host([no-fit]) #container {
                height: auto;
            }

            :host([no-fit]) #container #rowsContainer{
                height: auto;
            }

            #container {
				width: 100%;
                height: 100%;
                overflow: auto;
                contain: strict;
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
                min-height: 32px;
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
            }

            .row {
                display: flex;
                flex-direction: column;
                border-bottom: 1px solid var(--grey-light);
                background-color: white;
                width: 100%;
                flex-shrink: 0;
            }

            .cells {
                display: flex;
                flex-direction: row;
                background-color: inherit;
                white-space: nowrap;
                width: 100%;
                flex-shrink: 0;
            }

            .cell{
                display: flex;
                padding: 0 8px; 
                align-items: center;
                min-height: var(--pl-grid-cell-min-height);
                color: black;
                overflow: hidden;
                background-color: inherit;
                will-change: width;
                position: sticky;
                box-sizing: border-box;
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

            .row .cells:hover, 
            .row .cells:hover .cell[fixed], .row .cells:hover .cell[action],
            .row[active] .cells, 
            .row[active] .cells .cell[fixed], .row[active] .cells .cell[action]{
                white-space: normal;
                background-color: var(--primary-lightest);
                --pl-icon-fill-color: var(--black-base);
            }

            .tree-cell {
                cursor: pointer;
                width: 16px;
                padding-right: 8px;
                user-select: none;
            }

            .cell-content {
                width: 100%;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                background-color: inherit;
            }

            .summary-cell ::slotted(*) {
                display: flex;
                padding: 0 8px; 
                align-items: center;
                min-height: 32px;
                color: black;
                overflow: hidden;
                text-overflow: ellipsis;
                background-color: inherit;
                will-change: width;
                position: sticky;
            }

            #summary {
                display: flex;
                flex-direction: row;
                position: sticky;
                bottom: 0;
                background: var(--grey-lightest);
				z-index: 2;
                border-top: 1px solid var(--grey-light);
            }

            .top-toolbar ::slotted(*) {
                min-height: 48px;
                width: 100%;
                padding: 8px;
                gap: 8px;
                box-sizing: border-box;
            }

            .bottom-toolbar ::slotted(*) {
                min-height: 48px;
                width: 100%;
                padding: 8px;
                gap: 8px;
                box-sizing: border-box;
            }

            .expander {
                display:none;
            }

            .expander[opened] {
                height: auto;
                width: 100%;
                display: flex;
                min-height: fit-content;
                padding: 0 8px;
                box-sizing: border-box;
                overflow: hidden;
                -webkit-animation: slide-bottom 0.5s cubic-bezier(0.250, 0.460, 0.450, 0.940) both;
	            animation: slide-bottom 0.5s cubic-bezier(0.250, 0.460, 0.450, 0.940) both;
            }

            @keyframes slide-bottom{
                0% {
                    transform:translateY(-40px)
                }
                100%{
                    transform:translateY(0px)
                }
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
                        <pl-repeat items="[[_columns]]" as="column">
                            <template>
                                <div class="headerEl" hidden$=[[column.hidden]] fixed$=[[column.fixed]] action$="[[column.action]]" style$="[[_getCellStyle(column.index, column.width)]]">
                                    <slot name="[[_getSlotName(column.index)]]"></slot>
                                </div>
                            </template>
                        </pl-repeat>
                    </div>
                </div>
                <div id="rowsContainer">
                    <pl-virtual-scroll canvas="[[$.rowsContainer]]" items="{{_vdata}}" as="row" id="scroller">
                        <template id="tplRow">
                            <div class="row" active$="[[_isRowActive(row, selected)]]" on-click="[[_onRowClick]]" on-dblclick="[[_onRowDblClick]]">
                                <div class="cells">
                                    <pl-repeat items="[[_columns]]" as="column" id="cell-repeater">
                                        <template id="tplCol">
                                            <div style$="[[_getCellStyle(column.index, column.width)]]" class="cell" hidden$="[[column.hidden]]" fixed$="[[column.fixed]]" action$="[[column.action]]">
                                                <span class="tree-cell" style=[[_getRowPadding(row,column.index)]]" on-click="[[_onTreeNodeClick]]">
                                                    [[_getTreeIcon(row)]]
                                                </span>
                                                <span class="cell-content">[[column.cellTemplate]]</span>
                                            </div>
                                        </template>
                                    </pl-repeat>
                                </div>
                                <div class="expander" opened$=[[row._opened]]>
                                    [[_expandTemplate]]
                                </div>
                            </div>
                        </template>
                    </pl-virtual-scroll>
                </div>
                <div id="summary">
                    <pl-repeat items="[[_columns]]" as="column">
                        <template>
                            <div style$="[[_getCellStyle(column.index, column.width)]]" class="summary-cell">
                                <slot name="[[_getSummarySlotName(column.index)]]"></slot>
                            </div>
                        </template>
                    </pl-repeat>
                </div>
            </div>
            <div class="bottom-toolbar">
                <slot name="bottom-toolbar"></slot>
            </div>
        `;
    }

    connectedCallback() {
        super.connectedCallback();
        setTimeout(() => { if (this.data?.control) this.data.control.partialData = this.partialData; }, 0);
        this.addEventListener('column-attribute-change', this.onColumnAttributeChange);
        /* TODO: убрать, добавлено поскольку не срабатывает обсервер если значение задано до апгрейда компонента */
        if (this.data) this._dataObserver(this.data)

        let tpl = this.querySelector('template[is=expander]');
        if (tpl) {
            this._expandTemplate = tpl.tpl;
        }

        window.requestAnimationFrame(() => {
            this._init();
        });
    }

    _dataObserver(val, _old, mutation) {
        if (!mutation || (mutation.path === 'data' && mutation.action === 'upd')) {
            if (this.tree) {
                this.set('_vdata', this.buildTree(this.keyField, this.pkeyField, this.hasChildField));
            } else {
                this.set('_vdata', val);
            }
        } else {
            //TODO: fix mutation translate for tree
            if (this.tree) {
                this.applyTreeMutation(mutation);
            } else {
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
    }

    _getSlotName(index) {
        return `column-${index}`;
    }

    _getSummarySlotName(index) {
        return `summary-column-${index}`;
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

        if (this._expandTemplate) {
            let idx = this._vdata.indexOf(event.model.row);
            this.set(`_vdata.${idx}._opened`, !event.model.row._opened);
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
        if (event.model.row.__hasChilds === false) {
            return;
        }
        let idx = this._vdata.indexOf(event.model.row);
        this.set(`_vdata.${idx}._opened`, !event.model.row._opened);
        if (event.model.row._opened) {
            this.showChilds(event.model.row);
        } else {
            this.hideChilds(event.model.row);
        }
    }

    showChilds(item) {
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
            it._childsCount = addData.length;
            while (it._pitem) {
                it._pitem._childsCount += item._childsCount;
                it = it._pitem;
            }
            pendingShow.forEach(i => this.showChilds(i));
        }
    }

    hideChilds(item) {
        let it = item;
        const vindex = this._vdata.indexOf(it);
        this.splice('_vdata', vindex + 1, it._childsCount);
        while (it._pitem) {
            it._pitem._childsCount -= it._childsCount;
            it = it._pitem;
        }
        item._childsCount = null;
    }

    _getRowPadding(row, index) {
        if (index == 0 && (this.tree)) {
            return `padding-left: ${row._level * 16 + 'px'}`;
        }
        return 'display:none;';
    }

    _getTreeIcon(row) {
        if (!row._hasChilds) {
            return '';
        }

        return row._opened ? '-' : '+';
    }
    _vdataObserver(val, old, mutation) {
        //TODO: fix index translation for tree
        if (mutation) {
            let path = mutation.path.replace('_vdata', 'data');
            this.dispatchEvent(new CustomEvent('data-changed', { detail: { ...mutation, path } }));
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
                    this.showChilds(el);
                }
            })
        }
    }

    _treeModeChange(tree) {
        if (this.data.control) {
            this.data.control.mode = 'tree';
        }
    }

    buildTree(key, pkey, hasChild) {
        let hasChildField;
        const pKeys = new Set();
        if (!hasChild) {
            this.data.forEach(e => { pKeys.add(e[pkey]); });
        } else {
            hasChildField = hasChild || '_haschilds';
        }
        let vData = this.data.filter((i, c) => {
            i._index = c;
            i._childsCount = null;
            i._hasChilds = hasChildField ? i[hasChildField] : pKeys.has(i[key]);
            if (i[pkey] == null) {
                i._level = 0;
                return true;
            }
        });
        return vData;
    }

    /**
     * Apply data splice mutation to tree in virtual data
     * @param {DataMutation} m
     */
    applyTreeMutation(m) {
        console.log(m)
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
        // delete
        if (m.deletedCount > 0) {
            let di = m.deleted.map(i => this._vdata.indexOf(i)).filter(i => i >= 0);
            let delRanges = indexesToRanges(di);
            delRanges.forEach(rr => this.splice('_vdata', rr.start, rr.end - rr.start + 1));
        }
        // add
        // Обновляем индексы
        this.data.forEach((e, i) => { e._index = i; });
        // Вставляем в нужные места добавленные элементы
        if (m.addedCount > 0) {
            for (let i = m.index; i < (m.index + m.addedCount); i++) {
                const item = this.data[i];

                // проверяем, возможно для добаввленного элемента уже есть дочерние
                item._hasChilds = this.hasChildField ? item[this.hasChildField] : this.data.some(i => i[this.pkeyField] == item[this.keyField]);

                let pIndex; let parentItem;
                // Если вставляемая запись не имеет ссылки на родителя, добавляем к корням
                if (!item[this.pkeyField]) {
                    pIndex = -1;
                    parentItem = {
                        code: null, _level: -1, _opened: true, [this.keyField]: item[this.pkeyField]
                    };
                } else {
                    // Ищем родителя для вставки
                    pIndex = this._vdata.findIndex(vi => vi[this.keyField] == item[this.pkeyField]);
                    parentItem = this._vdata[pIndex];
                    if (!parentItem._hasChilds) this.set(['_vdata', pIndex, '_hasChilds'], true);
                }
                // Если родитель нашелся и он раскрыт, ищем куда в нем вставлять
                if (pIndex >= 0 || !item[this.pkeyField]) {
                    if (parentItem._opened) {
                        // Ищем потомка с индексом больше чем у того что нужно вставить,
                        // либо до конца текущего узла (если добавлять в конец)
                        // и вставляем элемент в найденную позицию

                        item._level = parentItem._level + 1;
                        // item.__hasChilds = this.hasChildField ? item[this.hasChildField] : false;
                        item._pitem = parentItem;
                        ////if (this.dataMode == 'tree' && item.__hasChilds) item.__needLoad = true;
                        let insertIndex = pIndex + 1;
                        while (this._vdata.length > insertIndex && this._vdata[insertIndex]._level > parentItem._level) {
                            if (this._vdata[insertIndex][this.pkeyField] == parentItem[this.keyField] && this._vdata[insertIndex]._index > item._index) {
                                // нашли потомка с большим индексом
                                break;
                            }
                            insertIndex++;
                        }

                        parentItem._childsCount = (parentItem._childsCount || 0) + 1;
                        let it = parentItem;
                        while (it._pitem) {
                            it._pitem.__childsCount += 1;
                            it = it._pitem;
                        }
                        this.splice('_vdata', insertIndex, 0, item);
                    }
                }
            }
        }
    }
}

customElements.define('pl-grid', PlGrid);
