import { PlElement, html, css } from "polylib";
import "@plcmp/pl-icon";
import "@plcmp/pl-iconset-default";
import { throttle } from "@plcmp/utils";
import dayjs from 'dayjs/esm/index.js';

class PlGridColumn extends PlElement {
    static get properties() {
        return {
            header: {
                type: String
            },
            width: {
                type: Number,
                observer: '_columnWidthObserver'
            },
            field: {
                type: String
            },
            hidden: {
                type: Boolean,
                reflectToAttribute: true
            },
            kind: {
                type: String
            },
            format: {
                type: String
            },
            resizable: {
                type: Boolean
            },
            sortable: {
                type: Boolean
            },
            sort: {
                type: String
            },
            fixed: {
                type: Boolean
            },
            action: {
                type: Boolean
            },
            _index: {
                type: Number
            },
            _template: {
                type: Object
            },
            _cellTemplate: {
                type: Object
            }
        }
    }

    static get css() {
        return css`
            :host{
                box-sizing: border-box;
                flex-direction: row;
                display: flex;
                min-height: 32px;
                overflow: hidden;
                background: var(--grey-lightest);
                color: var(--black-lightest);
                z-index: 2;
				position: sticky;
                font: var(--font-sm);
                will-change: width;
                padding: 0 8px;
            }

            :host([hidden]) {
                display: none;
            }

            :host ::slotted(*) {
                width: 16px;
                height: 16px;
            }

            .header {
                display: flex;
                width: 100%;
                align-items: center;
                flex-shrink: 0;
                gap: 8px;
            }

            .header-text {
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                width: 100%;
            }

            .column-resizer{
                cursor: ew-resize;
                height: 50%;
                border-right: 1px solid var(--grey-light);
                right: 0;
                position: absolute;
                width: 2px;
            }

            .column-sort {
                cursor: pointer;
            }
        `;
    }

    static get template() {
        return html`
            <div class="header">
                <slot name="prefix"></slot>
                <span class="header-text">
                    [[header]]
                </span>
                <span hidden$="[[_sortableHidden(sortable)]]" class="column-sort" on-click="[[_onSortClick]]">
                    <pl-icon iconset="pl-grid-icons" size="16" icon="[[_getSortIcon(sort)]]"></pl-icon>
                </span>
                <span hidden$="[[_resizableHiden(resizable)]]" class="column-resizer" on-mousedown="[[onResize]]">
                </span>
            </div>
        `;
    }

    connectedCallback() {
        super.connectedCallback();
        let tplEl = this.querySelector('template');
        if (tplEl) {
            this._cellTemplate = tplEl.tpl;
        }
        else {
            this._cellTemplate = html`[[_getValue(row, field, kind, format)]]`;
        }
        this._cellTemplate._hti = tplEl?._hti || this._ti;
        requestAnimationFrame(() => {
            if(!this.width) {
                this.width = this.offsetWidth;
            }
        });
    }

    _sortableHidden(sortable) {
        return !sortable;
    }

    _resizableHiden(resizable) {
        return !resizable;
    }

    onResize(event) {
        if (!this.width) this.width = this.offsetWidth;
        this._resizeBase = { baseSize: parseInt(this.width), baseMoveOffset: event.screenX };
        event.preventDefault();
        const moveHandler = (event) => {
            let throttler = throttle(() => {
                this.width = Math.max(50, this._resizeBase.baseSize + (event.screenX - this._resizeBase.baseMoveOffset));
            }, 100)

            throttler();
        };
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

    _getSortIcon() {
        let icon = 'sort';
        switch (this.sort) {
            case 'asc': {
                icon = 'sort-asc';
                break;
            }
            case 'desc': {
                icon = 'sort-desc';
                break;
            }
        }

        return icon;
    }

    _onSortClick(event) {
        if (!this.sort) {
            this.sort = 'asc';
        } else if (this.sort == 'asc') {
            this.sort = 'desc';
        }
        else {
            this.sort = '';
        }
        this.dispatchEvent(new CustomEvent('column-attribute-change', {
            detail: {
                attribute: 'sort',
                index: this._index,
                value: this.sort
            },
            bubbles: true
        }));
    }

    _columnWidthObserver(width) {
        this.dispatchEvent(new CustomEvent('column-attribute-change', {
            detail: {
                attribute: 'width',
                index: this._index,
                value: parseInt(width)
            },
            bubbles: true
        }));
    }

    _getValue(row, field, kind, format) {
        if (row) {
            if (kind == 'date') {
                return dayjs(row[field]).format(format || 'DD.MM.YYYY');
            }
            return row[field];
        }
    }
}

customElements.define('pl-grid-column', PlGridColumn);
