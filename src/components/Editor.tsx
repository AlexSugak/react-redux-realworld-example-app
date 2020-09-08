import ListErrors from './ListErrors'
import React from 'react'
import { push } from 'react-router-redux'
import { ReadOnlyAtom, Atom, F } from '@grammarly/focal'
import * as Rx from 'rxjs/operators'
import { Subject } from 'rxjs'
import { store } from '../store'
import agent from '../agent'

interface EditorState {
  errors: any[]
  inProgress: boolean

  articleSlug?: string
  title: string
  description: string
  body: string
  tagInput: string
  tagList: string[]
}

const initialState: EditorState = {
  errors: [],
  inProgress: false,
  articleSlug: undefined,
  title: '',
  description: '',
  body: '',
  tagInput: '',
  tagList: [],
}

enum EditorActions {
  ADD_TAG = 'ADD_TAG',
  EDITOR_PAGE_LOADED = 'EDITOR_PAGE_LOADED',
  REMOVE_TAG = 'REMOVE_TAG',
  ARTICLE_SUBMITTED = 'ARTICLE_SUBMITTED',
  EDITOR_PAGE_UNLOADED = 'EDITOR_PAGE_UNLOADED',
  UPDATE_FIELD_EDITOR = 'UPDATE_FIELD_EDITOR',
}

type AddTag = {
  kind: EditorActions.ADD_TAG
}

type RemoveTag = {
  kind: EditorActions.REMOVE_TAG
  tag: string
}

type LoadArticle = {
  kind: EditorActions.EDITOR_PAGE_LOADED
  slug: string
}

type UpdateEditorField = {
  kind: EditorActions.UPDATE_FIELD_EDITOR
  key: string
  value: any
}

type UnloadArticle = {
  kind: EditorActions.EDITOR_PAGE_UNLOADED
}

type SubmitArticle = {
  kind: EditorActions.ARTICLE_SUBMITTED
}

type EditorAction =
  | LoadArticle
  | AddTag
  | RemoveTag
  | UpdateEditorField
  | SubmitArticle
  | UnloadArticle

function isLoadArticleAction(action: EditorAction): action is LoadArticle {
  return action.kind === EditorActions.EDITOR_PAGE_LOADED
}

function isSubmitArticle(action: EditorAction): action is SubmitArticle {
  return action.kind === EditorActions.ARTICLE_SUBMITTED
}

class EditorViewModel {
  constructor(
    public actions: Subject<EditorAction> = new Subject<EditorAction>(),
    private _state: Atom<EditorState> = Atom.create<EditorState>(initialState)
  ) {
    const inProgress = this._state.lens('inProgress')
    const errors = this._state.lens('errors')

    const w = window as any
    w.getState = () => this._state.get()

    const handleError = (error: any) => {
      console.log('ERROR', error)
      errors.set(
        error.response.body.errors
          ? error.response.body.errors
          : error.response.body.error
          ? {[error.response.body.status]: error.response.body.error}
          : {['0']: 'unknown error'}
      )
    }

    // actions without side-effects
    actions
      .pipe(
        Rx.filter(
          (a) =>
            [
              EditorActions.ADD_TAG,
              EditorActions.REMOVE_TAG,
              EditorActions.UPDATE_FIELD_EDITOR,
              EditorActions.EDITOR_PAGE_UNLOADED,
            ].indexOf(a.kind) >= 0
        ),
        Rx.withLatestFrom(this._state),
        Rx.map(([action, state]) => {
          switch (action.kind) {
            case EditorActions.ADD_TAG:
              return { ...state, tagInput: '', tagList: state.tagList.concat([state.tagInput]) }
            case EditorActions.REMOVE_TAG:
              return { ...state, tagList: state.tagList.filter((t) => t !== action.tag) }
            case EditorActions.UPDATE_FIELD_EDITOR:
              return { ...state, [action.key]: action.value }
            case EditorActions.EDITOR_PAGE_UNLOADED:
              return initialState
            default:
              return state
          }
        })
      )
      .subscribe((state) => {
        this._state.set(state)
      })

    // load article
    actions
      .pipe(
        Rx.filter(isLoadArticleAction),
        Rx.tap(() => inProgress.set(true)),
        Rx.switchMap((a) => agent.Articles.get(a.slug)),
        Rx.tap(() => inProgress.set(false))
      )
      .subscribe(
        (resp: any) => {
          this._state.set({
            ...this._state.get(),
            articleSlug: resp.article.slug,
            title: resp.article.title,
            description: resp.article.description,
            body: resp.article.body,
            tagInput: '',
            tagList: resp.article.tagList,
          })
        },
        handleError
      )

    // submit article
    actions
      .pipe(
        Rx.filter(isSubmitArticle),
        Rx.withLatestFrom(this._state),
        Rx.tap(() => inProgress.set(true)),
        Rx.switchMap(([a, s]) => {
          const article = {
            title: s.title,
            description: s.description,
            body: s.body,
            tagList: s.tagList,
          }
          return s.articleSlug
            ? agent.Articles.update({ ...article, slug: s.articleSlug })
            : agent.Articles.create(article)
        }),
        Rx.tap(() => inProgress.set(false))
      )
      .subscribe(
        (resp: any) => {
          const state = this._state.get()
          const slug = state.articleSlug ? state.articleSlug : resp.article.slug
          const redirectUrl = `/article/${slug}`
          redirect(redirectUrl)
        },
        handleError
      )
  }

  get state(): ReadOnlyAtom<EditorState> {
    return this._state
  }
}

interface EditorProps {
  onAddTag: () => void
  onLoad: (slug: string) => void
  onRemoveTag: (tag: any) => void
  onSubmit: () => void
  onUnload: () => void
  onUpdateField: (key: any, value: any) => void
  state: ReadOnlyAtom<EditorState>
}

interface MatchProps {
  match: any
}

function redirect(url: string) {
  store.dispatch(push(url))
}

function connectFocal(
  EditorComponent: React.ComponentType<EditorProps & any>
): React.ComponentType<EditorProps & any> {
  const editorVM = new EditorViewModel()

  return ({ ...props }) => (
    <EditorComponent
      {...props}
      onAddTag={() => editorVM.actions.next({ kind: EditorActions.ADD_TAG })}
      onRemoveTag={(tag: string) => editorVM.actions.next({ kind: EditorActions.REMOVE_TAG, tag })}
      onUnload={() => editorVM.actions.next({ kind: EditorActions.EDITOR_PAGE_UNLOADED })}
      onUpdateField={(key: string, value: any) =>
        editorVM.actions.next({ kind: EditorActions.UPDATE_FIELD_EDITOR, key, value })
      }
      onLoad={(slug: string) =>
        editorVM.actions.next({ kind: EditorActions.EDITOR_PAGE_LOADED, slug })
      }
      onSubmit={() => editorVM.actions.next({ kind: EditorActions.ARTICLE_SUBMITTED })}
      state={editorVM.state}
    />
  )
}

class Editor extends React.Component<EditorProps & MatchProps> {
  changeTitle: (ev: any) => void
  changeDescription: (ev: any) => void
  changeBody: (ev: any) => void
  changeTagInput: (ev: any) => void
  watchForEnter: (ev: any) => void
  removeTagHandler: (tag: any) => () => void
  submitForm: (ev: any) => void

  constructor(props: EditorProps & MatchProps) {
    super(props)

    const updateFieldEvent = (key: any) => (ev: any) =>
      this.props.onUpdateField(key, ev.target.value)
    this.changeTitle = updateFieldEvent('title')
    this.changeDescription = updateFieldEvent('description')
    this.changeBody = updateFieldEvent('body')
    this.changeTagInput = updateFieldEvent('tagInput')

    this.watchForEnter = (ev) => {
      if (ev.keyCode === 13) {
        ev.preventDefault()
        this.props.onAddTag()
      }
    }

    this.removeTagHandler = (tag) => () => {
      this.props.onRemoveTag(tag)
    }

    this.submitForm = (ev) => {
      ev.preventDefault()
      this.props.onSubmit()
    }
  }

  componentWillReceiveProps(nextProps: any) {
    if (this.props.match.params.slug !== nextProps.match.params.slug) {
      if (nextProps.match.params.slug) {
        this.props.onUnload()
        return this.props.onLoad(this.props.match.params.slug)
      }
    }
  }

  componentWillMount() {
    if (this.props.match.params.slug) {
      return this.props.onLoad(this.props.match.params.slug)
    }
  }

  componentWillUnmount() {
    this.props.onUnload()
  }

  render() {
    const state = this.props.state
    const errors = state.view('errors')
    const title = state.view('title')
    const description = state.view('description')
    const body = state.view('body')
    const tagInput = state.view('tagInput')
    const tagList = state.view('tagList')
    const inProgress = state.view('inProgress')

    return (
      <div className="editor-page">
        <div className="container page">
          <div className="row">
            <div className="col-md-10 offset-md-1 col-xs-12">
              <F.Fragment>
                {errors.pipe(Rx.map((errors) => <ListErrors errors={errors}></ListErrors>))}
              </F.Fragment>

              <form>
                <fieldset>
                  <fieldset className="form-group">
                    <F.input
                      className="form-control form-control-lg"
                      type="text"
                      placeholder="Article Title"
                      value={title}
                      onChange={this.changeTitle}
                    />
                  </fieldset>

                  <fieldset className="form-group">
                    <F.input
                      className="form-control"
                      type="text"
                      placeholder="What's this article about?"
                      value={description}
                      onChange={this.changeDescription}
                    />
                  </fieldset>

                  <fieldset className="form-group">
                    <F.textarea
                      className="form-control"
                      rows={8}
                      placeholder="Write your article (in markdown)"
                      value={body}
                      onChange={this.changeBody}
                    />
                  </fieldset>

                  <fieldset className="form-group">
                    <F.input
                      className="form-control"
                      type="text"
                      placeholder="Enter tags"
                      value={tagInput}
                      onChange={this.changeTagInput}
                      onKeyUp={this.watchForEnter}
                    />

                    <F.div className="tag-list">
                      {tagList.pipe(
                        Rx.map((tagList) =>
                          tagList.map((tag) => {
                            return (
                              <span className="tag-default tag-pill" key={tag}>
                                <i
                                  className="ion-close-round"
                                  onClick={this.removeTagHandler(tag)}
                                ></i>
                                {tag}
                              </span>
                            )
                          })
                        )
                      )}
                    </F.div>
                  </fieldset>

                  <F.button
                    className="btn btn-lg pull-xs-right btn-primary"
                    type="button"
                    disabled={inProgress}
                    onClick={this.submitForm}
                  >
                    Publish Article
                  </F.button>
                </fieldset>
              </form>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default connectFocal(Editor)
