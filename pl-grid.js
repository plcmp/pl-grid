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
        _hasFooter: { type: Boolean, value: false },
        getRowPartName: { type: Function, value: () => { } },
        getCellPartName: { type: Function, value: () => { } }
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
            contain: strict;
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

        .headerEl {
            height: 100%;
            box-sizing: border-box;
            border-inline-end: 1px solid var(--pl-grey-light);
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

        .headerEl[action],
        .footerEl[action] {
            right: 0;
            position: var(--pl-action-column-position, sticky);
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
            border-inline-end: none;
        }

        .row[loading]::after {
            position: absolute;
            width: 100%;
            height: 100%;
            top: 0;
            left:0;
            display: flex;
            content:'Загрузка...';
            align-items: center;
            justify-content: center;
        }

        .cell {
            display: flex;
            align-items: center;
            background-color: inherit;
            box-sizing: border-box;
            border-inline-end: 1px solid var(--pl-grey-light);
            height: var(--pl-grid-cell-min-height, var(--pl-base-size));
            white-space: var(--pl-grid-cell-white-space, nowrap);
        }

        .cell > * {
            padding: 0 var(--pl-space-sm);
            box-sizing: border-box;
        }
        
        .cell * {
            word-wrap: break-word;
            text-overflow: ellipsis;
            overflow: hidden;
        }

        .cell[fixed] {
            position: sticky;
            background-color: var(--pl-grey-lightest);
            z-index:1;
        }

        .cell[action] {
            position: var(--pl-action-column-position, absolute);
            right: 0;
            border-inline-start: 1px solid var(--pl-grey-light);
            border-inline-end: none;
            background-color: var(--pl-grey-lightest);
            z-index:1;
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

        pl-virtual-scroll {
            display: none;
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
                    <div d:repeat="[[_columns]]" d:as="column" class="headerEl" hidden$=[[column.hidden]] fixed$=[[column.fixed]] action$="[[column.action]]" class$="[[_getCellClass(column, 'headerEl)]]">
                        <slot name="[[_getSlotName(column.index)]]"></slot>
                    </div>
                </div>
            </div>
            <div id="rowsContainer" part="rows">
                <pl-virtual-scroll canvas="[[$.rowsContainer]]" items="{{_vdata}}" as="row" id="scroller">
                    <template id="tplRow">
                        <div part$="[[_getRowParts(row)]]" class="row" loading$="[[_isPlaceholder(row)]]" active$="[[_isRowActive(row, selected)]]" on-click="[[_onRowClick]]" on-dblclick="[[_onRowDblClick]]">
                            <template d:repeat="[[_filterCols(_columns)]]" d:as="column">
                                <div part$="[[_getCellParts(row, column)]]" class$="[[_getCellClass(column, 'cell')]]" hidden$="[[column.hidden]]" fixed$="[[column.fixed]]" action$="[[column.action]]">
                                    [[getTemplateForCell(tree, multiSelect, column.index)]]
                                    [[column.cellTemplate]]
                                </div>
                            </template>
                        </div>
                    </template>
                </pl-virtual-scroll>
            </div>
            <div id="footerContainer">
                <div id="footer">
                    <div  d:repeat="[[_filterCols(_columns)]]" d:as="column" class="footerEl" hidden$=[[column.hidden]] fixed$=[[column.fixed]] action$="[[column.action]]" class$="[[_getCellClass(column, 'footerEl)]]">
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
        this.addEventListener('column-attribute-change', this.onColumnAttributeChange);
        const styleComment = Array.from(this.childNodes)
            .find(node => node.nodeType === Node.COMMENT_NODE && node._tpl && node._tpl.tpl.matches('[is="extra styles"]'));

        if (styleComment) this.shadowRoot.append(styleComment._tpl.tpl.content.cloneNode(true));

        const headerResizeObserver = new ResizeObserver(throttle((entries) => {
            let headerWidth = entries[0].contentRect.width;
            if(this.$.container.offsetWidth >= headerWidth) {
                this.$.rowsContainer.style.width = '100%';
            } else {
                this.$.rowsContainer.style.width = headerWidth + 'px';
            }
        }, 10));

        headerResizeObserver.observe(this.$.header);

        const containerResizeObserver = new ResizeObserver(throttle(() => {
            if (this.$.container.scrollHeight <= this.$.container.offsetHeight) {
                this.$.container.style.setProperty('--pl-footer-container-position', 'absolute');
            } else {
                this.$.container.style.setProperty('--pl-footer-container-position', 'sticky');
            }
            if (this.$.container.offsetWidth > this.$.header.offsetWidth) {
                this.$.container.style.setProperty('--pl-action-column-position', 'absolute');
            } else {
                this.$.container.style.setProperty('--pl-action-column-position', 'sticky');
            }
        }, 10));

        containerResizeObserver.observe(this.$.container);

        const observer = new MutationObserver((mutationsList) => {
            for (let mutation of mutationsList) {
                if (mutation.type === 'childList') {
                    // this._init();
                }
            }
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
    }

    _getCellClass(col, el) {
        return el + ' ' + col.class;
    }

    onColumnAttributeChange(event) {
        const { index, attribute, value, init } = event.detail;
        if (this._columns[index]) {
            if (attribute === 'width') {
                this._changeColumnWidth(this._columns[index], value);
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
        let realColumns = this._columns.filter(x => x.headerCol == false);
        let columns = realColumns.map(x => x.width ? x.width + 'px' : '1fr').join(' ');
        let maxRows = Math.max(...this._columns.map(o => o.row), 0);

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

            colStyles['.' + el.class] = style.join(';');
            colStyles['.headerEl.' + el.class] = el.headerCol ? `grid-area: ${el.class}; border-bottom: 1px solid var(--pl-grey-light)` : `grid-area: ${el.class}`;
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
                    matrix[i][j] = { class: childCol.class, parentIndex: childCol.parentIndex };
                } else {
                    let el = this._columns.find(x => x.index == matrix[i + 1][j].parentIndex && x.row == i + 1);
                    if (el) {
                        matrix[i][j] = { class: el.class, parentIndex: el.parentIndex };;
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
        })
    }

    _init() {
        const columnsNodes = Array.prototype.slice.call(this.querySelectorAll('pl-grid-column'));
        let row = 1;
        this._columns = columnsNodes.map((column, index) => {
            column.setAttribute('slot', `column-${index}`);
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
                parentIndex: column.parentIndex,
                cellTemplate: column._cellTemplate,
                footerTemplate: column._footerTemplate,
                node: column,
                class: 'column' + index,
                headerCol: false,
                row: column.row || row
            };

            column._index = index;

            let childColumns = Array.prototype.slice.call(column.querySelectorAll(':scope > pl-grid-column'));
            if (childColumns.length > 0) {
                info.headerCol = true;
                childColumns.forEach((el) => {
                    el.parentIndex = info.index;
                    el.row = info.row + 1;
                    this.append(el);
                });
            }

            return info;
        });

        if (this._columns.find(x => x.footerTemplate)) {
            this.$.container.style.setProperty('--pl-footer-display', 'flex');
        }

        this.reactToResize();
    }

    _filterCols(cols) {
        return cols.filter(x => x.headerCol == false)
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

    _changeColumnWidth(column, width) {
        this.set(`_columns.${column.index}.width`, width);
        this.reactToResize();
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

        return row._opened ? 'chevron-down' : 'chevron-right';
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

    _getFooterTemplate(_hasFooter) {
        return _hasFooter ? PlGrid.footerTemplate : undefined;
    }

    _isPlaceholder(row) {
        return row instanceof PlaceHolder;
    }
}

customElements.define('pl-grid', PlGrid);