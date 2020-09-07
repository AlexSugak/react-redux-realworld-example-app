import ListErrors from './ListErrors'
import React from 'react'
import { push } from 'react-router-redux'
import { ReadOnlyAtom, Atom, F } from '@grammarly/focal'
import * as Rx from 'rxjs/operators'
import { store } from '../store'

import agent from '../agent'
import {
  ADD_TAG,
  EDITOR_PAGE_LOADED,
  REMOVE_TAG,
  ARTICLE_SUBMITTED,
  EDITOR_PAGE_UNLOADED,
  UPDATE_FIELD_EDITOR,
  REDIRECT,
} from '../constants/actionTypes'

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
  const state = Atom.create(initialState)
  const inProgress = state.lens('inProgress')
  const errors = state.lens('errors')

  const updateState = (update: (stateInput: EditorState) => EditorState): void => {
    state.set(update(state.get()))
  }

  const updateStateAsync = (
    update: (currentState: EditorState, result: any) => EditorState,
    action: (currentState: EditorState) => Promise<any>,
    onSuccess?: (currentState: EditorState) => void
  ): void => {
    inProgress.set(true)

    action(state.get()).then(
      (res) => {
        console.log('RESULT', res)
        updateState((s) => update(s, res))
        inProgress.set(false)
        if (onSuccess){
          onSuccess(state.get())
        } 
      },
      (error) => {
        console.log('ERROR', error)
        inProgress.set(false)
        errors.set(error.response.body.errors ? error.response.body.errors : null)
      }
    )

    return
  }

  return (({...props}) => 
    <EditorComponent
      {...props}
      onAddTag={() =>
        updateState((s) => ({ ...s, tagInput: '', tagList: s.tagList.concat([s.tagInput]) }))
      }
      onRemoveTag={(tag: string) =>
        updateState((s) => ({ ...s, tagList: s.tagList.filter((t) => t !== tag) }))
      }
      onUnload={() => updateState(() => initialState)}
      onUpdateField={(key: string, value: any) =>
        updateState((s) => {
          return { ...s, [key]: value }
        })
      }
      onLoad={(slug: string) => {
        updateStateAsync(
          (s, resp) => ({
            ...s,
            articleSlug: resp.article.slug,
            title: resp.article.title,
            description: resp.article.description,
            body: resp.article.body,
            tagInput: '',
            tagList: resp.article.tagList,
          }),
          () => agent.Articles.get(slug)
        )
      }}
      onSubmit={() => {
        updateStateAsync(
          (s, resp) => {
            return { ...s, inProgress: false, articleSlug: resp.article.slug }
          },
          (s) => {
            const article = {
              title: s.title,
              description: s.description,
              body: s.body,
              tagList: s.tagList,
            }

            return s.articleSlug
              ? agent.Articles.update({...article, slug: s.articleSlug })
              : agent.Articles.create(article)
          },
          s => {
            const redirectUrl = `/article/${s.articleSlug}`
            redirect(redirectUrl)
          }
        )
      }}
      state={state}
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
