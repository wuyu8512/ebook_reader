import { Storage } from '@/util/storage'
import { trimStr, formatDate, guid } from '../util/index'
import { BookList } from './mockData'
import store from './index'

const LOCAL_BOOK_LIST_KEY = 'EBookReader_BOOK'

export default {
  state: {
    list: Storage.read(LOCAL_BOOK_LIST_KEY) || BookList
  },
  getters: {
    localBookExist: (state, getters) => {
      return getters.allGroup.length > 0 || getters.allList.length > 0
    },
    BookList: (state) => {
      return state.list
    },
    hasGroup: (state, getters) => {
      return (gid) => {
        // ignroe null group
        if (gid === null) return true
        return !!getters.allGroup.find((item) => item.gid === gid)
      }
    },
    groupTitleExist: (state, getters) => {
      return (title, gid) => {
        let str = trimStr(title)
        if (str.length === 0) return true
        return !!getters.allGroup.find((item) => item.gid !== gid && item.data.title === str)
      }
    },
    cacheTitleExist: (state, getters) => {
      return (title, gid) => {
        let str = trimStr(title)
        if (str.length === 0) return true
        return (
          !!getters.allGroup.find((item) => item.gid !== gid && item.data.title === str) ||
          !!getters.BookListCache.find((item) => !item.bid && item.gid !== gid && item.data.title === str)
        )
      }
    },
    hasBook: (state, getters) => {
      return (bid) => {
        return !!getters.allList.find((item) => item.bid === bid)
      }
    },
    findBook: (state, getters) => {
      return (book_path) => {
        return getters.allList.find((item) => item.book_path === book_path)
      }
    },
    findGroup: (state, getters) => {
      return (gid) => {
        return getters.BookList.find((item) => item.gid === gid)
      }
    },
    mapList: (state, getters) => {
      return (list) => {
        return {
          list: getters.allList.filter(
            (item) => !!list.find(({ bid, gid }) => item.bid === bid || (!bid && item.gid === gid))
          ),
          group: getters.allGroup.filter((item) => !!list.find(({ bid, gid }) => !bid && item.gid === gid))
        }
      }
    }
  },
  mutations: {
    updateBookList(state, payload) {
      state.list = payload || []
      Storage.write(LOCAL_BOOK_LIST_KEY, state.list)
    }
  },
  actions: {
    addBookGroup({ commit, getters, dispatch }, payload) {
      let { title, idx = null } = payload || {}
      title = trimStr(title)
      if (!getters.groupTitleExist(title)) {
        let newGroup = {
          gid: guid(),
          last_update_time: formatDate(new Date(), 'yyyy-MM-dd hh:mm:sss'),
          idx,
          data: {
            title
          }
        }
        let newList = [...getters.allGroup, newGroup]
        commit('updateBookGroup', newList)
        return newGroup
      } else {
        return false
      }
    },
    removeBookGroup({ commit, getters, dispatch }, payload) {
      if (!Array.isArray(payload)) {
        payload = [payload]
      }
      let newList = getters.allGroup.filter((item) => !payload.find((p) => p.gid === item.gid))
      commit('updateBookGroup', newList)
      return true
    },
    updateBookGroup({ commit, getters, dispatch }, payload) {
      if (!Array.isArray(payload)) {
        payload = [payload]
      }
      let newList = getters.allGroup.map((item) => {
        let find = payload.find((p) => p.gid === item.gid)
        return find && !getters.groupTitleExist(find.data.title, find.gid)
          ? {
            ...item,
            ...find,
            last_update_time: formatDate(new Date(), 'yyyy-MM-dd hh:mm:sss'),
            data: {
              ...item.data,
              ...find.data
            }
          }
          : item
      })
      commit('updateBookGroup', newList)
      return true
    },
    addToBook({ commit, getters, dispatch }, payload) {
      let newList = [
        payload,
        ...getters.BookList
      ]

      commit('updateBookList', newList)
      return true
    },
    removeFromBook({ commit, getters, dispatch }, payload) {
      if (!Array.isArray(payload)) {
        payload = [payload]
      }
      let newList = getters.allList.filter((item) => !payload.find((p) => p.bid === item.bid))
      commit('updateBookList', newList)
      return true
    },
    updateBook({ commit, getters, dispatch }, payload) {
      if (!Array.isArray(payload)) {
        payload = [payload]
      }
      let newList = getters.allList.map((item) => {
        let find = payload.find((p) => p.bid === item.bid)
        return find && getters.hasGroup(find.gid)
          ? {
            ...item,
            last_update_time: formatDate(new Date(), 'yyyy-MM-dd hh:mm:sss'),
            ...find,
            data: {
              ...item.data,
              ...find.data
            }
          }
          : item
      })
      commit('updateBookList', newList)
      return true
    }
  }
}

function sortBook(a, b) {
  let aIdx = a.idx || 0
  let bIdx = b.idx || 0
  if (aIdx > bIdx) {
    return 1
  } else if (aIdx < bIdx) {
    return -1
  } else {
    return a.last_update_time > b.last_update_time ? -1 : 1
  }
}

window.addToBook = function(path, name) {
  const time = new Date()
  const temp = {
    book_title: name,
    book_path: path,
    add_time: `${time.getFullYear()}-${time.getMonth() + 1}-${time.getDate()}`,
    book_cover: name
  }
  store.dispatch('addToBook', temp)
}