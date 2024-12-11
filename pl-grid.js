import { css, html, PlElement, Template } from "polylib";

import '@plcmp/pl-virtual-scroll';

import "@plcmp/pl-icon";
import "@plcmp/pl-iconset-default";
import "@plcmp/pl-data-tree";
import "@plcmp/pl-checkbox";

import { PlResizeableMixin, throttle, PlaceHolder } from '@plcmp/utils';

import "./pl-grid-column.js";

class PlGrid extends PlResizeableMixin(PlElement) {
    static properties = {
        data: { type: Array, value: () => [], observer: '_dataObserver' },
        selected: { type: Object, value: () => null, observer: '_selectedObserver' },
        tree: { type: Boolean, observer: '_treeModeChange' },
        _vdata: { type: Array, value: () => [] },
        _columns: { type: Array, value: () => [] },
        keyField: { type: String },
        pkeyField: { type: String },
        hasChildField: { type: String, value: '_haschildren' },
        multiSelect: { type: Boolean, value: false },
        selectedList: { type: Array, value: [] },
        getRowPartName: { type: Function, value: () => { } },
        getCellPartName: { type: Function, value: () => { } },
        variableRowHeight: { type: Boolean, value: false, observer: '_variableRowHeightObserver' },
        growing: { type: Boolean, value: false, observer: '_growingObserver' }
    }

    static css = css`
        :host {
            width: 100%;
            height: 100%;
            border: 1px solid var(--pl-grey-light);
            border-radius: var(--pl-border-radius);
            display: flex;
            flex-direction: column;
            position: relative;
            box-sizing: border-box;
            background-color: var(--pl-background-color);
        }

        #container {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            overflow: auto;
            position:relative;
            contain: var(--pl-grid-contain, size);
        }

        #headerContainer{
            display: flex;
            width: 100%;
            position: sticky;
            z-index: 2;
            top: 0;
        }

        #footerContainer {
            display: var(--pl-footer-display, none);
            height: var(--pl-base-size);
            width: 100%;
            background-color: var(--pl-grey-lightest);
            z-index: 2;
            bottom: 0;
            position: var(--pl-footer-container-position, absolute);
        }

        #header{
            display: grid;
            background-color: var(--pl-grey-lightest);
            border-bottom: 1px solid var(--pl-grey-light);
            flex: 1;
        }

        #footer{
            display: var(--pl-grid-header-display, flex);
            background-color: var(--pl-grey-lightest);
            border-top: 1px solid var(--pl-grey-light);
            flex: 1;
        }

        .cell.headerEl {
            height: 100%;
            white-space: normal;
            padding: var(--pl-space-sm);
            min-height: var(--pl-base-size);
            justify-content: flex-start;
            text-align: left;
            align-items: flex-start;            
        }

        .cell.headerEl.group {
            align-items: center;
            justify-content: center;
        }

        .footerEl {
            display: flex;
            align-items: center;
            height: 100%;
            padding: var(--pl-space-sm);
            box-sizing: border-box;
            font: var(--pl-header-font);
            color: var(--pl-header-color);
        }

        .footerCell{
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .headerEl[fixed], 
        .footerEl[fixed] {
            position: sticky;
            z-index: 3;
            background-color: inherit;
        }

        .column-resizer {
            height: 100%;
            inset-inline-end: 0;
            inset-block-start: 0;
            position: absolute;
            width: 4px;
            padding: 0 !important;
        }

        .column-resizer:hover  {
            cursor: ew-resize;
            border-inline-end: 2px solid var(--pl-primary-base);
        }

        .headerEl[action],
        .footerEl[action] {
            position: var(--pl-action-column-position, absolute);
            background-color: var(--pl-grey-lightest);
            border-inline-start: 1px solid var(--pl-grey-light);
            border-inline-end: 1px solid transparent;
            z-index: 3;
        }

        .headerEl:nth-last-child(1 of :not([action])) {
            border-inline-end: 1px solid transparent;
        }
        
        .headerEl[hidden], .footerEl[hidden] {
            display: none;
        }

        #rowsContainer {
            height: 100%;
            width: 100%;
            position: relative;
            display: flex;
            flex-direction: column;
            flex-shrink:0;
        }

        .row {
            display: flex;
            flex-direction: row;
            border-bottom: 1px solid var(--pl-grey-light);
            background-color: var(--pl-background-color);
            color: var(--pl-text-color);
            width: 100%;
            box-sizing: border-box;
            position: relative;
        }

        .cell:nth-last-child(1 of :not([action])) {
            border-inline-end: 1px solid transparent;
        }

        .headerEl:nth-last-child(1 of [fixed]),
        .footerEl:nth-last-child(1 of [fixed]),
        .cell:nth-last-child(1 of [fixed]) {
            border-inline-end: 2px solid var(--pl-grey-base);
        }

        .headerEl:nth-child(1 of [action]),
        .footerEl:nth-child(1 of [action]),
        .cell:nth-child(1 of [action]) {
            border-inline-start: 2px solid var(--pl-grey-base);
        }

        .cell {
            display: flex;
            align-items: var(--pl-grid-cell-align-items, center);
            background-color: inherit;
            box-sizing: border-box;
            border-inline-end: 1px solid var(--pl-grey-light);
            height: var(--pl-grid-cell-height, var(--pl-base-size));
            white-space: var(--pl-grid-cell-white-space, nowrap);
            position: relative;
        }

        .cell > span {
            padding: var(--pl-space-sm);
        }
        
        .cell * {
            word-wrap: break-word;
            text-overflow: ellipsis;
            overflow: hidden;
        }

        .row[loading] {
            cursor: wait;
        }
        .row[loading] .cell {
            background: var(--background-color);
            pointer-events: none;
            padding: 0;
        }

        .row[loading] .cell::after {
            width: 100%;
            height: calc(100% - 16px);
            margin: 16px 8px;
            display: flex;
            content:'';
            border-radius: var(--pl-border-radius);
            background: var(--pl-grey-light);
            animation: skeleton 1s ease-in-out forwards infinite;
            animation-direction: alternate;
        }

        .row[loading] .cell * {
            display: none;
        }

        @keyframes skeleton {
            0% {
                opacity: 0.2;
                transform: scale(0.98);
            }
            85%, 100% {
                opacity: 0.8;
                transform: scale(1);
            }
        }

        .cell[fixed] {
            position: sticky;
            z-index:1;
        }

        .cell[action] {
            position: var(--pl-action-column-position, absolute);
            right: 0;
            border-inline-start: 1px solid var(--pl-grey-light);
            border-inline-end: 1px solid transparent;
            z-index:1;
            min-height: 100%;
        }

        .cell[hidden] {
            display: none;
        }

        .row:hover, 
        .row:hover .cell,
        .row[active], 
        .row[active] .cell{
            background-color: var(--pl-primary-lightest);
            color: var(--pl-text-color);
        }

        .row[loading]:hover {
            background-color: transparent;
        }

        .row[active]{
            z-index: 1;
         }

        .top-toolbar ::slotted(*) {
            width: 100%;
            padding: var(--pl-space-sm);
            box-sizing: border-box;
            border-bottom: 1px solid var(--pl-grey-light);
        }

        .bottom-toolbar ::slotted(*) {
            border-top: 1px solid var(--pl-grey-light);
            width: 100%;
            padding: var(--pl-space-sm);
            box-sizing: border-box;
        }

        .multi-checkbox {
            height: var(--pl-base-size);
            width: var(--pl-base-size);
        }
    `;
    static checkboxCellTemplate = `<pl-checkbox class="multi-checkbox" checked="[[_itemSelected(row, selectedList)]]" on-click="[[_onSelect]]"></pl-checkbox>`;
    static treeFirstCellTemplate = `<pl-icon-button style$="[[_getRowMargin(row, column.index)]]" variant="link" iconset="pl-default" icon="[[_getTreeIcon(row)]]" on-click="[[_onTreeNodeClick]]"></pl-icon-button>`;

    static template = html`
        <style id="columnSizes"></style>
        <div class="top-toolbar">
            <slot name="top-toolbar"></slot>
        </div>
        <div id="container">
            <div id="headerContainer">
                <div id="header">
                    <div d:repeat="[[_columns]]" d:as="column" hidden$=[[column.hidden]] fixed$=[[column.fixed]] action$="[[column.action]]" class$="[[_getCellClass(column, 'headerEl')]]">
                        <div>[[column.header]]</div>
                        <span hidden$="[[column._isHeaderColumn]]" class="column-resizer" on-mousedown="[[onResize]]"></span>
                    </div>
                </div>
            </div>
            <div id="rowsContainer" part="rows">
                <pl-virtual-scroll canvas="[[$.rowsContainer]]" items="{{_vdata}}" as="row" id="scroller" variable-row-height=[[variableRowHeight]]>
                    <template id="tplRow">
                        <div part$="[[_getRowParts(row)]]" class="row" loading$="[[_isPlaceholder(row)]]" active$="[[_isRowActive(row, selected)]]" on-click="[[_onRowClick]]" on-dblclick="[[_onRowDblClick]]">
                            <template d:repeat="[[_filterCols(_columns)]]" d:as="column">
                                <div part$="[[_getCellParts(row, column)]]" class$="[[_getCellClass(column, 'cell')]]" hidden$="[[column.hidden]]" fixed$="[[column.fixed]]" action$="[[column.action]]">
                                    [[getTemplateForCell(tree, multiSelect, column.index)]]
                                    [[column.cellTemplate]]
                                    <span class="column-resizer" on-mousedown="[[onResize]]"></span>
                                </div>
                            </template>
                        </div>
                    </template>
                </pl-virtual-scroll>
            </div>
            <div id="footerContainer">
                <div id="footer">
                    <div d:repeat="[[_filterCols(_columns)]]" d:as="column" class="footerEl" hidden$=[[column.hidden]] fixed$=[[column.fixed]] action$="[[column.action]]" class$="[[_getCellClass(column, 'footerEl)]]">
                        <div class="footerCell">
                            [[column.footerTemplate]]
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="bottom-toolbar">
            <slot name="bottom-toolbar"></slot>
        </div>
        <pl-data-tree bypass="[[!tree]]" key-field="[[keyField]]" pkey-field="[[pkeyField]]" has-child-field="[[hasChildField]]" in="{{data}}" out="{{_vdata}}"></pl-data-tree>
    `;

    connectedCallback() {
        super.connectedCallback();

        this.scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
          
        this.addEventListener('column-attribute-change', this.onColumnAttributeChange);
        const styleComment = Array.from(this.childNodes)
            .find(node => node.nodeType === Node.COMMENT_NODE && node._tpl && node._tpl.tpl.matches('[is="extra styles"]'));

        if (styleComment) this.shadowRoot.append(styleComment._tpl.tpl.content.cloneNode(true));

        const headerResizeObserver = new ResizeObserver(throttle((entries) => {
            let headerWidth = entries[0].contentRect.width;

            if (this.$.container.offsetWidth > headerWidth) {
                this.$.rowsContainer.style.width = '100%';
            } else {
                this.$.rowsContainer.style.width = headerWidth + 'px';
            }
        }, 5));

        headerResizeObserver.observe(this.$.header);

        const containerResizeObserver = new ResizeObserver(throttle(() => {
            if (this.$.container.scrollHeight <= this.$.container.offsetHeight) {
                this.$.container.style.setProperty('--pl-footer-container-position', 'absolute');
            } else {
                this.$.container.style.setProperty('--pl-footer-container-position', 'sticky');
            }

            this.$.scroller.render()
        }, 5));

        containerResizeObserver.observe(this.$.container);

        const observer = new MutationObserver(() => {
            this._init();
        });

        observer.observe(this, { attributes: false, childList: true, subtree: true });

        // let nested column components upgrade, then call _init method
        setTimeout(() => {
            if (this.data?.control) {
                this._treeModeChange();
            }
            this._init();
        }, 0);
    }

    _variableRowHeightObserver(val) {
        if(val) {
            this.$.container.style.setProperty('--pl-grid-cell-height', 'auto');
            this.$.container.style.setProperty('--pl-grid-cell-white-space', 'normal');
            this.$.container.style.setProperty('--pl-grid-cell-align-items', 'flex-start');
        }
    }

    onResize(event) {
        let columnIdx = event.model.column.index;
        let width = event.model.column.width;
        let minWidth = event.model.column.minWidth;
        if (!width) width = this.root.querySelector(`.headerEl.column-${columnIdx}`).offsetWidth;
        let _resizeBase = { baseSize: parseInt(width), baseMoveOffset: event.screenX };
        event.preventDefault();
        const moveHandler = throttle((event) => {
            width = Math.max(minWidth, _resizeBase.baseSize + (event.screenX - _resizeBase.baseMoveOffset));
            this._changeColumnWidth(this._columns[columnIdx], width);
        }, 10)

        const removeHandlers = () => {
            document.removeEventListener('mousemove', moveHandler);
            document.removeEventListener('mouseup', upHandler);
        };
        const upHandler = () => {
            removeHandlers();
        };
        document.addEventListener('mousemove', moveHandler);
        document.addEventListener('mouseup', upHandler);
    }


    _growingObserver(val) {
        if(val) {
            this.$.container.style.setProperty('--pl-grid-contain', 'none');
        }
    }

    _dataObserver(data, old, mut) {
        if (mut.action === 'splice' && mut.path == 'data') {
            if (mut?.deleted?.includes(this.selected)) {
                this.selected = null;
            }
        }

        if (mut.path != 'data' && this.selected) {
            let m = mut.path.match(/^data\.(\d*)/);
            if (m[1] == this.data.indexOf(this.selected)) {
                this.forwardNotify(mut, `data.${m[1]}`, 'selected');
            }
        }

        this.reactToResize();
    }

    _getCellClass(col, el) {
        if(el == 'headerEl') {
            return el + ' ' + col.class + ' cell' + (col._isHeaderColumn ? ' group' : '');
        }

        return el + ' ' + col.class;
    }

    onColumnAttributeChange(event) {
        const { index, attribute, value, init } = event.detail;
        if (this._columns[index]) {
            if (attribute === 'width') {
                this._changeColumnWidth(this._columns[index], value, init);
            }
            if (attribute === 'sort') {
                this._changeColumnSort(this._columns[index], value, init)
            }
            if (attribute === 'hidden') {
                this.set(`_columns.${index}.hidden`, value);
            }
        }
    }

    _getRowParts(row) {
        let rowNames = this.getRowPartName?.(row) || '';
        return ('row ' + rowNames).trim();
    }

    _getCellParts(row, column) {
        let cellNames = this.getCellPartName?.(row, column) || '';
        return ('cell ' + cellNames).trim();
    }

    reactToResize() {
        if (this._columns.length == 0) {
            return;
        }
        let colStyles = {};
        let realColumns = this._columns.filter(x => x._isHeaderColumn == false);
        let columns = realColumns.map(x => x.width ? x.width + 'px' : '1fr').join(' ');
        let maxRows = Math.max(...this._columns.map(o => o.node._row), 0);

        this._columns.forEach((el) => {
            let style = [];
            if (el.width) {
                style.push(`width: ${el.width}px`);
                style.push(`min-width: ${el.minWidth}px`);
            }
            else {
                style.push(`flex: 1`);
                style.push(`min-width: ${el.minWidth}px`);
            }

            style.push(`justify-content: ${el.justify}`);
            switch (el.justify) {
                case 'end':
                case 'flex-end':
                case 'right': {
                    style.push('text-align: end')
                    break;
                }

                case 'start':
                case 'flex-start':
                case 'left': {
                    style.push('text-align: start')
                    break;
                }

                case 'center': {
                    style.push('text-align: center;')
                    break;
                }
            }

            if (el.fixed) {
                const left = realColumns.findIndex(x => x.index == el.index) == 0 ? '0' : realColumns[el.index - 1].width + 'px';
                style.push(`left: ${left}`);
            }

            if (el.action) {
                const right = realColumns.findIndex(x => x.index == el.index) == realColumns.length - 1 ? '0' : realColumns[el.index - 1].width + 'px';
                style.push(`right: ${right}`);
            }

            colStyles['.' + el.class] = style.join(';');
            colStyles['.headerEl.' + el.class] = el._isHeaderColumn ? `grid-area: ${el.class}; border-bottom: 1px solid var(--pl-grey-light)` : `grid-area: ${el.class}`;
        });

        let classes = ``;
        for (let cls in colStyles) {
            classes += cls + `{
                ${colStyles[cls]}
            }  `
        }

        const matrix = Array.from({ 'length': maxRows }, () => Array(realColumns.length).fill(null));
        for (let i = maxRows - 1; i != -1; i--) {
            for (let j = 0; j < realColumns.length; j++) {
                if (matrix[i + 1] == undefined) {
                    let childCol = this._columns.find(x => x.index == realColumns[j].index);
                    matrix[i][j] = { class: childCol.class, parentIndex: childCol.node._parentIndex };
                } else {
                    let el = this._columns.find(x => x.index == matrix[i + 1][j].parentIndex && x.node._row == i + 1);
                    if (el) {
                        matrix[i][j] = { class: el.class, parentIndex: el.node._parentIndex };;
                    } else {
                        matrix[i][j] = { class: matrix[i + 1][j].class, parentIndex: matrix[i + 1][j].parentIndex };;
                    }
                }
            }
        }
        const joined = matrix.map(x => x.map(y => y.class).join(' '));
        let areas = '';
        joined.forEach((el) => {
            areas += `"${el}"`
        })

        classes += `#header {
            grid-template-columns: ${columns};    
            grid-template-rows: repeat(${maxRows}, auto);
            grid-template-areas: ${areas};
        }`;

        this.$.columnSizes.textContent = classes;


        setTimeout(() => {
            // необходимо для отрисовки грида во вкладках, которые изнчально скрыты
            this.$.scroller.render();
            let colWidth = Array.from(this.root.querySelectorAll('.headerEl')).map(x => x.offsetWidth).reduce((a, c) => { return a + c }, 0) + 2;
            if (this.$.header.scrollWidth > colWidth) {
                this.$.container.style.setProperty('--pl-action-column-position', 'absolute');
            } else {
                this.$.container.style.setProperty('--pl-action-column-position', 'sticky');
            }
        }, 0)
    }

    _init() {
        const columnsNodes = Array.from(this.querySelectorAll('pl-grid-column'));
        let row = 1;
        this._columns = columnsNodes.map((column, index) => {
            const info = {
                kind: column.kind,
                header: column.header,
                hidden: column.hidden || false,
                field: column.field,
                justify: column.justify,
                width: column.width ? parseInt(column.width) : null,
                minWidth: column.minWidth ? parseInt(column.minWidth) : 50,
                resizable: column.resizable,
                fixed: column.fixed || false,
                action: column.action || false,
                index: index,
                cellTemplate: column._cellTemplate,
                footerTemplate: column._footerTemplate,
                _isHeaderColumn: false,
                node: column
            };

            info.class = 'column-' + index

            column._index = info.index;
            column._parentIndex = column._parentIndex;
            column._row = column._row || row;

            let childColumns = Array.from(column.querySelectorAll(':scope > pl-grid-column'));
            if (childColumns.length > 0) {
                info._isHeaderColumn = true;
                childColumns.forEach((el) => {
                    el._parentIndex = info.node._index;
                    el._row = info.node._row + 1;
                });
            }
            return info;
        });

        if (this._columns.find(x => x.footerTemplate)) {
            this.$.container.style.setProperty('--pl-footer-display', 'flex');
        }
        requestAnimationFrame(() => {
            this.reactToResize();
        })
    }

    _filterCols(cols) {
        return cols.filter(x => !x._isHeaderColumn)
    }

    _isRowActive(row, selected) {
        return row === selected;
    }

    _changeColumnSort(column, sort, init) {
        let sorts = [...this.data.sorts] || [];
        const ind = sorts.findIndex(item => item.field === column.field);
        if (ind >= 0) {
            sorts.splice(ind, 1);
        }

        let newSort = {
            field: column.field,
            sort: sort
        };

        sorts.splice(0, 0, newSort);

        // если сортировка была указана в гриде, то выставляем ее по-тихому, без уведомления о мутации
        // иначе по клику на сортировку вызываем мутацию и перезагружаем датасет 
        if (init) {
            this.data.sorts = sorts;
        } else {
            this.set('data.sorts', sorts);
        }
    }

    _changeColumnWidth(column, width, init) {
        if (!init) {
            this.set(`_columns.${column.index}.width`, width);
            this.reactToResize();
        }
    }

    _getSlotName(index) {
        return `column-${index}`;
    }

    async beforeSelect(model) {
        return true;
    }

    _itemSelected(item, selectedList) {
        return this.multiSelect && selectedList.filter(x => x == item).length > 0;
    }

    async _onRowClick(event) {
        const res = await this.beforeSelect(event.model.row);
        if (!res) {
            return false;
        }

        // проверка, что выделенный элемент присутствует в списке видимых данных
        // необходимо при инлайн удалении строки
        if (event.model.row && this._vdata.includes(event.model.row)) {
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
        let idx = this.data.indexOf(event.model.row);
        this.set(`data.${idx}._opened`, !event.model.row._opened);
    }

    _getRowMargin(row, index) {
        if (index === 0 && (this.tree)) {
            return `margin-left: ${row._level * 16 + 'px'}`;
        }
        return 'display:none;';
    }

    _getTreeIcon(row) {
        if (!row._haschildren) {
            return '';
        }

        return row._opened ? 'chevron-down-s' : 'chevron-right-s';
    }

    _selectedObserver(val, old, mutation) {
        if (!val) {
            return;
        }

        if (this.tree) {
            const parents = [];

            while (val._pitem != null) {
                val = val._pitem;
                parents.push(val);
            }

            parents.reverse().forEach((el) => {
                if (!el._opened) {
                    const idx = this.data.indexOf(el);
                    this.set(`data.${idx}._opened`, true);
                }
            })
        }

        if (mutation.path != 'selected') {
            this.forwardNotify(mutation, `selected`, `data.${this.data.indexOf(this.selected)}`);
        }
    }
    _treeModeChange() {
        if (this.data.control && this.tree) {
            this.data.control.treeMode = {
                hidValue: undefined,
                keyField: this.keyField,
                hidField: this.pkeyField,
                filterByHid: true
            };
        } else if (this.data.control) {
            delete this.data.control.treeMode;
        }
    }

    _onSelect(event) {
        let idx = this.selectedList.indexOf(event.model.row);
        if (idx == -1) {
            this.push('selectedList', event.model.row);
        } else {
            this.splice('selectedList', idx, 1);
        }
    }

    getTemplateForCell(tree, multiSelect, index) {
        if (index !== 0) {
            return undefined;
        }
        if (!this.tree && !this.multiSelect) {
            return undefined;
        }

        if (this.tree && !this.multiSelect) {
            return new Template(PlGrid.treeFirstCellTemplate);
        }

        if (!this.tree && this.multiSelect) {
            return new Template(PlGrid.checkboxCellTemplate);
        }

        if (this.tree && this.multiSelect) {
            return new Template(PlGrid.treeFirstCellTemplate + PlGrid.checkboxCellTemplate);
        }
    }

    _isPlaceholder(row) {
        return row instanceof PlaceHolder;
    }
}

customElements.define('pl-grid', PlGrid);